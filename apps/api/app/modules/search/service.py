"""
D-04: 論文検索 - サービス
"""
from app.core.semantic_scholar import SemanticScholarClient
from app.core.gemini import gemini_client
from app.core.config import settings
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse
from fastapi import HTTPException
import logging
import asyncio
import re

from app.core.search import ArxivClient, PubmedClient, ScholarClient, SearchResult
import uuid
import traceback

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        self.arxiv = ArxivClient()
        self.pubmed = PubmedClient()
        self.scholar = ScholarClient()
        self.gemini = gemini_client

        self._domain_profiles = {
            "pubmed": {
                "single": {
                    "clinical", "patient", "trial", "cancer", "protein", "proteins",
                    "gene", "genes", "genome", "genomics", "genetic", "cell", "cells",
                    "disease", "medicine", "medical", "drug", "molecule", "mutation",
                    "immune", "immunology", "microbiome", "hospital", "therapy",
                    "epidemiology", "pathology", "biology", "biological", "symptom",
                    "symptoms", "cohort", "randomized", "placebo", "oncology",
                    "cardiology", "diabetes", "psychiatry", "neuronal", "antibody",
                    "antibodies", "vaccine", "vaccination", "biomarker",
                },
                "phrases": {
                    "clinical trial", "randomized controlled trial", "deep learning",
                    "drug discovery", "protein structure", "protein interactions",
                },
            },
            "cs": {
                "single": {
                    "transformer", "attention", "learning", "neural", "llm", "gpt",
                    "bert", "nlp", "vision", "cv", "reinforcement", "algorithm",
                    "model", "models", "embedding", "language", "dataset", "datasets",
                    "graph", "network", "networks", "token", "tokens", "prompt",
                    "prompting", "pretraining", "finetuning", "fine", "tuning",
                },
                "phrases": {
                    "attention is all you need", "large language model", "graph neural network",
                    "vision transformer", "diffusion model", "pretraining",
                    "self attention", "machine translation", "retrieval augmented",
                },
            },
            "math": {
                "single": {
                    "math", "mathematics", "algebra", "topology", "geometry",
                    "analysis", "probability", "statistics", "optimization", "proof",
                    "theorem", "proofs", "graph", "tensor", "equation", "equations",
                    "linear", "differential", "manifold", "combinatorics", "number",
                    "theory", "inference", "regression", "clustering", "sampling",
                    "gaussian", "stochastic", "bayes", "bayesian",
                },
                "phrases": {
                    "machine learning theory", "information theory", "convex optimization",
                    "probability theory", "graph theory", "markov chain",
                    "fourier transform", "manifold learning", "differential equation",
                },
            },
            "physics": {
                "single": {
                    "quantum", "physics", "particle", "particles", "field", "forces",
                    "condensed", "matter", "material", "materials", "matter", "spin",
                    "optics", "cosmology", "astrophysics", "relativity", "superconductivity",
                    "electromagnetism", "photon", "photonics",
                },
                "phrases": {
                    "quantum mechanics", "quantum field", "general relativity",
                    "gravitational waves", "dark matter", "dark energy", "condensed matter",
                },
            },
        }

    async def search_papers(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0,
        source: str = "auto",
        uid: str | None = None,
    ) -> SearchResultListResponse:
        """
        論文を検索する。source引数で検索対象を指定可能。
        valid sources: "auto", "all", "arxiv", "pubmed", "scholar", "gemini"
        """
        results: list[SearchResult] = []
        
        try:
            if source == "all":
                per_source_limit = min(limit, max(1, (limit + 2) // 3))
                search_tasks = {
                    "arxiv": self.arxiv.search(query, per_source_limit),
                    "pubmed": self.pubmed.search(query, per_source_limit),
                    "scholar": self.scholar.search(query, per_source_limit),
                }
                task_results = await asyncio.gather(*search_tasks.values(), return_exceptions=True)
                for source_name, result_or_exc in zip(search_tasks.keys(), task_results):
                    if isinstance(result_or_exc, Exception):
                        logger.warning("Search API Warning (%s): %s", source_name, result_or_exc)
                        continue
                    results.extend(result_or_exc)
            elif source == "auto":
                preferred_order = self._infer_sources_by_domain(query)
                used_sources: set[str] = set()
                for source_name in preferred_order:
                    used_sources.add(source_name)
                    part_results = await self._safe_search(source_name, query, limit)
                    results.extend(part_results)

                    # 1次のソースで十分結果が出ている場合はそれを採用
                    if len(results) >= limit:
                        break

                # 足りなければ残りのソースで補完
                for fallback_source in ("arxiv", "pubmed", "scholar"):
                    if len(results) >= limit:
                        break
                    if fallback_source in used_sources:
                        continue
                    part_results = await self._safe_search(fallback_source, query, limit - len(results))
                    results.extend(part_results)

            elif source == "arxiv":
                results = await self._safe_search("arxiv", query, limit)
            elif source == "pubmed":
                results = await self._safe_search("pubmed", query, limit)
            elif source == "scholar":
                results = await self._safe_search("scholar", query, limit)
            elif source == "gemini":
                # Gemini logic (Legacy/Fallback)
                raw_data = await self._safe_search("gemini", query, limit)
                if isinstance(raw_data, list):
                    raw_data = {"data": raw_data}
                for p in raw_data.get("data", []):
                    results.append(SearchResult(
                        title=p.get("title", ""),
                        authors=[a.get("name") for a in p.get("authors", [])],
                        year=p.get("year"),
                        venue=p.get("venue", ""),
                        abstract=p.get("abstract", ""),
                        external_ids=p.get("externalIds", {}),
                        pdf_url=p.get("openAccessPdf", {}).get("url") if p.get("openAccessPdf") else None,
                        source="gemini"
                    ))
            else:
                # Default fallback: auto
                results = await self._safe_search("arxiv", query, limit)
                
        except Exception as e:
            print(f"Search API Error ({source}): {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Search API Error ({source}): {str(e)}")

        # ユーザーのライブラリ（いいね済みID一覧）を取得
        liked_ids: set[str] = set()
        if uid:
            try:
                from app.modules.papers.repository import PaperRepository
                paper_repo = PaperRepository()
                liked_ids = set(await paper_repo.get_user_likes(uid))
            except Exception:
                pass  # ライブラリ取得に失敗しても検索結果は返す

        # Convert to Response Schema
        results = self._dedupe_and_rank_results(results, query)
        results = results[:limit]

        items = []
        for r in results:
            items.append(self._convert_to_item(r, liked_ids))

        return SearchResultListResponse(
            results=items,
            total=len(items),
            offset=offset,
            limit=limit
        )

    async def _safe_search(
        self,
        source: str,
        query: str,
        limit: int,
    ) -> list[SearchResult] | dict:
        try:
            if source == "arxiv":
                return await self.arxiv.search(query, limit)
            if source == "pubmed":
                return await self.pubmed.search(query, limit)
            if source == "scholar":
                return await self.scholar.search(query, limit)
            if source == "gemini":
                return await self.gemini.search_papers(query, limit=limit)

            return []
        except Exception as exc:
            logger.warning("Search API Warning (%s): %s", source, exc)
            return []

    def _infer_sources_by_domain(self, query: str) -> list[str]:
        """
        Query-level heuristic for preferred API order.
        - Bio/medicine: PubMed first
        - CS/math/physics: ArXiv first
        - others: Scholar first as general fallback
        """
        normalized = query.lower()
        tokens = set(re.findall(r"[a-z]+", normalized))
        scores: dict[str, int] = {}

        for domain, data in self._domain_profiles.items():
            score = 0
            for phrase in data["phrases"]:
                if phrase in normalized:
                    score += 2
            for token in data["single"]:
                if token in tokens:
                    score += 1
            scores[domain] = score

        ordered = sorted(scores.items(), key=lambda pair: pair[1], reverse=True)
        top_domain, top_score = ordered[0]

        if top_score == 0:
            return ["scholar", "arxiv", "pubmed"]

        if top_domain == "pubmed":
            return ["pubmed", "arxiv", "scholar"]

        if top_domain in {"cs", "math", "physics"}:
            return ["arxiv", "scholar", "pubmed"]

        return ["scholar", "arxiv", "pubmed"]

    def _convert_to_item(self, result: SearchResult, liked_ids: set[str] | None = None) -> SearchResultItem:
        # ID handling
        paper_id = None
        
        # 1. Try to use external ID as ID
        if result.external_ids.get("ArXiv"):
            paper_id = result.external_ids["ArXiv"]
        elif result.external_ids.get("DOI"):
            paper_id = f"doi:{result.external_ids['DOI']}"
        elif result.external_ids.get("PubMed"):
            paper_id = f"pubmed:{result.external_ids['PubMed']}"
            
        if not paper_id:
            paper_id = str(uuid.uuid4())

        # ライブラリに含まれているか判定
        is_in_library = paper_id in liked_ids if liked_ids else False

        return SearchResultItem(
            external_id=paper_id,
            source=result.source,
            title=result.title,
            authors=result.authors,
            year=result.year,
            venue=result.venue,
            abstract=result.abstract,
            doi=result.external_ids.get("DOI"),
            arxiv_id=result.external_ids.get("ArXiv"),
            pdf_url=result.pdf_url,
            citation_count=0,
            is_in_library=is_in_library
        )

    def _normalize_text(self, text: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", " ", text.lower())
        return re.sub(r"\s+", " ", normalized).strip()

    def _title_match_score(self, title: str, query: str) -> int:
        if not title or not query:
            return 0

        normalized_title = self._normalize_text(title)
        normalized_query = self._normalize_text(query)
        if not normalized_title or not normalized_query:
            return 0

        if normalized_title == normalized_query:
            return 2000

        if normalized_query in normalized_title:
            return 1500

        query_tokens = set(re.findall(r"[a-z0-9]+", normalized_query))
        title_tokens = set(re.findall(r"[a-z0-9]+", normalized_title))
        if not query_tokens:
            return 0

        overlap_ratio = len(query_tokens & title_tokens) / len(query_tokens)
        return int(overlap_ratio * 1000)

    def _dedupe_and_rank_results(
        self,
        results: list[SearchResult],
        query: str,
    ) -> list[SearchResult]:
        """
        Duplicate result 제거 및 정렬:
        - 외부ID 우선 dedupe, fallback는 제목+연도로 처리
        - タイトル一致スコア + 연도 + 제목 알파벳 순
        """
        seen: set[str] = set()
        deduped: list[tuple[SearchResult, int, int, str]] = []

        for r in results:
            normalized = ""
            arxiv_id = r.external_ids.get("ArXiv")
            doi = r.external_ids.get("DOI")
            pubmed_id = r.external_ids.get("PubMed")

            if arxiv_id:
                normalized = f"arxiv:{arxiv_id}".lower()
            elif doi:
                normalized = f"doi:{doi}".lower()
            elif pubmed_id:
                normalized = f"pubmed:{pubmed_id}".lower()
            else:
                normalized = f"title:{r.title.strip().lower()}:{r.year or 0}"

            if normalized and normalized not in seen:
                seen.add(normalized)
                deduped.append(
                    (
                        r,
                        self._title_match_score(r.title, query),
                        r.year or 0,
                        r.title.lower(),
                    )
                )

        deduped.sort(key=lambda item: (item[1], item[2], item[3]), reverse=True)
        return [r for r, _score, _year, _title in deduped]


search_service = SearchService()
