"""
Keyword Related Service
"""

import asyncio
import re
from typing import Any

from app.core.firestore import get_firestore_client
from app.modules.keyword_related.schemas import (
    KeywordRelatedGroup,
    KeywordRelatedItem,
    LibraryRelatedByKeywordResponse,
)
from app.modules.papers.repository import PaperRepository


class KeywordRelatedService:
    def __init__(self):
        self.db = None
        self.paper_repo = PaperRepository()

    def _ensure_db_initialized(self):
        if self.db is None:
            self.db = get_firestore_client()

    async def get_library_related_by_keywords(
        self,
        paper_id: str,
        uid: str,
        per_keyword_limit: int = 15,
        max_keywords: int = 8,
    ) -> LibraryRelatedByKeywordResponse:
        self._ensure_db_initialized()

        paper_ref = self.db.collection("papers").document(paper_id)
        paper_doc = await paper_ref.get()
        if not paper_doc.exists:
            return LibraryRelatedByKeywordResponse(
                paper_id=paper_id,
                groups=[],
                meta={"library_size": 0, "keywords_used": 0, "deduped_count": 0},
            )

        target_data = paper_doc.to_dict() or {}
        ordered_keywords = self._extract_ordered_keywords(target_data, max_keywords)
        liked_ids = await self.paper_repo.get_user_likes(uid)
        candidate_ids = [pid for pid in liked_ids if pid != paper_id]

        candidate_docs = await asyncio.gather(
            *[self.db.collection("papers").document(pid).get() for pid in candidate_ids]
        )
        candidates = []
        for doc in candidate_docs:
            if not doc.exists:
                continue
            data = doc.to_dict() or {}
            raw_keywords = self._extract_raw_keywords(data)
            candidates.append(
                {
                    "paper_id": doc.id,
                    "title": data.get("title", "No Title"),
                    "authors": self._extract_authors(data.get("authors", [])),
                    "year": data.get("year"),
                    "keyword_pairs": [
                        (self._normalize_text(tag), tag)
                        for tag in raw_keywords
                        if self._normalize_text(tag)
                    ],
                    "normalized_keywords": {
                        self._normalize_text(k)
                        for k in raw_keywords
                        if self._normalize_text(k)
                    },
                    "normalized_title": self._normalize_text(data.get("title", "")),
                }
            )

        seen_paper_ids: set[str] = set()
        groups: list[KeywordRelatedGroup] = []

        for keyword in ordered_keywords:
            normalized_keyword = self._normalize_text(keyword)
            if not normalized_keyword:
                continue

            matched: list[dict[str, Any]] = []
            for candidate in candidates:
                if candidate["paper_id"] in seen_paper_ids:
                    continue
                score, reason, matched_tag = self._match_keyword_candidate(
                    keyword, normalized_keyword, candidate
                )
                if score <= 0:
                    continue
                matched.append(
                    {
                        "paper_id": candidate["paper_id"],
                        "title": candidate["title"],
                        "authors": candidate["authors"],
                        "year": candidate["year"],
                        "matched_tag": matched_tag,
                        "candidate_tag": matched_tag if score == 0.7 else None,
                        "reason": reason,
                        "score": score,
                    }
                )

            matched.sort(
                key=lambda item: (-item["score"], -self._safe_year(item["year"]))
            )
            selected = matched[:per_keyword_limit]
            for item in selected:
                seen_paper_ids.add(item["paper_id"])

            groups.append(
                KeywordRelatedGroup(
                    keyword=keyword,
                    items=[KeywordRelatedItem(**item) for item in selected],
                )
            )

        return LibraryRelatedByKeywordResponse(
            paper_id=paper_id,
            groups=groups,
            meta={
                "library_size": len(candidate_ids),
                "keywords_used": len(ordered_keywords),
                "deduped_count": len(seen_paper_ids),
            },
        )

    def _extract_raw_keywords(self, paper_data: dict) -> list[str]:
        result: list[str] = []
        for key in ("keywords", "prerequisite_keywords", "prerequisiteKeywords"):
            raw = paper_data.get(key, [])
            if isinstance(raw, str):
                result.append(raw.strip())
            elif isinstance(raw, list):
                for item in raw:
                    if isinstance(item, str):
                        result.append(item.strip())
                    elif isinstance(item, dict):
                        for field in ("name", "label", "keyword", "term"):
                            value = item.get(field)
                            if isinstance(value, str) and value.strip():
                                result.append(value.strip())
                                break
        return [text for text in result if text]

    def _extract_ordered_keywords(self, paper_data: dict, max_keywords: int) -> list[str]:
        raw_keywords = self._extract_raw_keywords(paper_data)
        ordered: list[str] = []
        seen: set[str] = set()
        for keyword in raw_keywords:
            normalized = self._normalize_text(keyword)
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            ordered.append(keyword)
            if len(ordered) >= max_keywords:
                break
        return ordered

    @staticmethod
    def _normalize_text(text: str) -> str:
        if not isinstance(text, str):
            return ""
        normalized = re.sub(r"\([^)]*\)", " ", text)
        normalized = normalized.replace("-", " ")
        normalized = normalized.lower()
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized.strip()

    @staticmethod
    def _extract_authors(raw_authors: list[Any]) -> list[str]:
        authors: list[str] = []
        for author in raw_authors or []:
            if isinstance(author, str):
                authors.append(author)
            elif isinstance(author, dict):
                name = author.get("name")
                if isinstance(name, str):
                    authors.append(name)
        return authors

    def _match_keyword_candidate(
        self,
        keyword: str,
        normalized_keyword: str,
        candidate: dict[str, Any],
    ) -> tuple[float, str | None, str | None]:
        keyword_pairs: list[tuple[str, str]] = candidate.get("keyword_pairs", [])

        for normalized_tag, raw_tag in keyword_pairs:
            if normalized_keyword == normalized_tag:
                return 1.0, f"{keyword}キーワード一致", raw_tag

        partial_match = self._best_partial_tag(normalized_keyword, keyword_pairs)
        if partial_match:
            return 0.7, f"{keyword}概念近接", partial_match

        if normalized_keyword in candidate["normalized_title"]:
            fallback_tag = self._best_overlap_tag(normalized_keyword, keyword_pairs)
            return 0.6, f"{keyword}主題一致", fallback_tag
        return 0.0, None, None

    @staticmethod
    def _best_partial_tag(
        normalized_keyword: str,
        keyword_pairs: list[tuple[str, str]],
    ) -> str | None:
        best_tag: str | None = None
        best_score = -1
        for normalized_tag, raw_tag in keyword_pairs:
            if not (
                normalized_keyword in normalized_tag
                or normalized_tag in normalized_keyword
            ):
                continue
            score = len(set(normalized_keyword.split()) & set(normalized_tag.split()))
            if score > best_score:
                best_score = score
                best_tag = raw_tag
        return best_tag

    @staticmethod
    def _best_overlap_tag(
        normalized_keyword: str,
        keyword_pairs: list[tuple[str, str]],
    ) -> str | None:
        best_tag: str | None = None
        best_score = 0
        keyword_tokens = set(normalized_keyword.split())
        for normalized_tag, raw_tag in keyword_pairs:
            overlap = len(keyword_tokens & set(normalized_tag.split()))
            if overlap > best_score:
                best_score = overlap
                best_tag = raw_tag
        return best_tag

    @staticmethod
    def _safe_year(value) -> int:
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.strip():
            try:
                return int(value.strip())
            except ValueError:
                return 0
        return 0


keyword_related_service = KeywordRelatedService()
