"""D-09: 読解サポート - サービス"""
import asyncio
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from google.cloud import aiplatform, firestore

from app.core.config import settings
from app.core.embedding import generate_embedding
from app.core.firestore import get_firestore_client
from app.core.gemini import gemini_client
from app.modules.papers.repository import PaperRepository
from app.modules.reading.schemas import (
    ExplainRequest,
    ExplainResponse,
    LibraryAskCitation,
    LibraryAskRequest,
    LibraryAskResponse,
    PaperChunk,
    PaperOutlineItem,
    HighlightCreate,
    HighlightItem,
)
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def _chunked(values: list[str], size: int) -> list[list[str]]:
    return [values[i : i + size] for i in range(0, len(values), size)]


def _to_page_range(page_number: int | None) -> list[int]:
    if not page_number or page_number <= 0:
        return [1]
    return [int(page_number)]


class ReadingService:
    """読解サポート系のサービス"""

    def __init__(self):
        self.db = get_firestore_client()
        self.paper_repository = PaperRepository()
        self.executor = ThreadPoolExecutor(max_workers=2)

        self.vector_enabled = bool(settings.vector_index_endpoint_id)
        self.index_endpoint_name = (
            f"projects/{settings.gcp_project_id}/locations/{settings.gcp_region}/indexEndpoints/{settings.vector_index_endpoint_id}"
            if self.vector_enabled
            else ""
        )
        self.deployed_index_id = "ai_paper_deployed_index"

        if self.vector_enabled:
            try:
                aiplatform.init(
                    project=settings.gcp_project_id,
                    location=settings.gcp_region,
                )
            except Exception as exc:
                logger.warning(f"Vector search init failed: {exc}")
                self.vector_enabled = False

    async def _ensure_library_access(self, owner_uid: str, paper_id: str):
        paper = await self.paper_repository.get_by_id(paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="paper not found")

        liked_ids = set(await self.paper_repository.get_user_likes(owner_uid))
        if paper_id not in liked_ids:
            raise HTTPException(status_code=403, detail="paper is not in your library")

    async def get_outline(self, paper_id: str, owner_uid: str) -> list[PaperOutlineItem]:
        """論文チャンクをページ単位で集約した簡易アウトラインを返す"""
        await self._ensure_library_access(owner_uid, paper_id)

        chunks = await self._get_chunks_for_paper(paper_id)
        if not chunks:
            return []

        chunks.sort(key=lambda c: (c["page_range"][0], c["chunk_id"]))
        outline: list[PaperOutlineItem] = []
        for chunk in chunks:
            page = chunk["page_range"][0]
            if not outline or outline[-1].end_page < page - 1:
                outline.append(
                    PaperOutlineItem(
                        start_page=page,
                        end_page=page,
                        chunk_count=1,
                        first_chunk_id=chunk["chunk_id"],
                        last_chunk_id=chunk["chunk_id"],
                    )
                )
            else:
                item = outline[-1]
                item.end_page = page
                item.chunk_count += 1
                item.last_chunk_id = chunk["chunk_id"]

        return outline

    async def get_chunks(self, paper_id: str, owner_uid: str, section: str | None = None) -> list[PaperChunk]:
        """論文IDに紐づくチャンク一覧を返す"""
        await self._ensure_library_access(owner_uid, paper_id)
        _ = section
        chunks = await self._get_chunks_for_paper(paper_id)
        return [PaperChunk(**c) for c in chunks]

    async def explain(self, paper_id: str, owner_uid: str, req: ExplainRequest) -> ExplainResponse:
        """選択テキストの要約説明を返す"""
        await self._ensure_library_access(owner_uid, paper_id)

        if not req.selected_text and not req.chunk_id:
            raise HTTPException(
                status_code=400,
                detail="selected_text or chunk_id is required",
            )

        source_chunk_id = req.chunk_id or "unknown"
        page_range = [1]
        context = req.selected_text

        if req.chunk_id:
            chunk = await self._get_chunk_by_id(req.chunk_id, paper_id)
            if not chunk:
                raise HTTPException(status_code=404, detail="chunk not found")
            context = f"{chunk['text'][:3000]}"
            page_range = chunk["page_range"]
            source_chunk_id = chunk["chunk_id"]

        if not context:
            raise HTTPException(status_code=400, detail="empty context for explanation")

        explanation = await self._ask_llm(
            question="選択テキストの意味を簡潔に説明してください。",
            context=context,
            max_chars=1200,
        )

        confidence = 0.95 if explanation else 0.45
        return ExplainResponse(
            explanation=explanation,
            source_chunk_id=source_chunk_id,
            page_range=page_range,
            confidence=confidence,
        )

    async def create_highlight(self, paper_id: str, owner_uid: str, req: HighlightCreate) -> HighlightItem:
        """ハイライト保存"""
        await self._ensure_library_access(owner_uid, paper_id)
        if req.start_offset < 0 or req.end_offset < req.start_offset:
            raise HTTPException(status_code=400, detail="invalid offset range")

        highlight_id = str(uuid4())
        highlight_ref = (
            self.db.collection("papers")
            .document(paper_id)
            .collection("highlights")
            .document(highlight_id)
        )

        data = {
            "ownerUid": owner_uid,
            "paperId": paper_id,
            "chunkId": req.chunk_id,
            "textSpan": req.text_span,
            "startOffset": req.start_offset,
            "endOffset": req.end_offset,
            "pageNumber": req.page_number,
            "note": req.note,
            "color": req.color,
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
        await highlight_ref.set(data)

        return HighlightItem(
            id=highlight_id,
            owner_uid=owner_uid,
            paper_id=paper_id,
            chunk_id=req.chunk_id,
            text_span=req.text_span,
            start_offset=req.start_offset,
            end_offset=req.end_offset,
            page_number=req.page_number,
            note=req.note,
            color=req.color,
            created_at=None,
        )

    async def list_highlights(self, paper_id: str, owner_uid: str) -> list[HighlightItem]:
        """ハイライト一覧"""
        await self._ensure_library_access(owner_uid, paper_id)
        highlights_ref = (
            self.db.collection("papers")
            .document(paper_id)
            .collection("highlights")
        )
        query = highlights_ref.order_by("createdAt", direction=firestore.Query.DESCENDING)
        items: list[HighlightItem] = []
        async for doc in query.stream():
            data = doc.to_dict() or {}
            items.append(
                HighlightItem(
                    id=doc.id,
                    owner_uid=data.get("ownerUid", owner_uid),
                    paper_id=paper_id,
                    chunk_id=data.get("chunkId"),
                    text_span=data.get("textSpan", ""),
                    start_offset=int(data.get("startOffset", 0)),
                    end_offset=int(data.get("endOffset", 0)),
                    page_number=int(data.get("pageNumber", 1)),
                    note=data.get("note", ""),
                    color=data.get("color", "yellow"),
                    created_at=data.get("createdAt").isoformat()
                    if hasattr(data.get("createdAt"), "isoformat")
                    else None,
                )
            )
        return items

    async def ask_library(self, owner_uid: str, req: LibraryAskRequest) -> LibraryAskResponse:
        """ライブラリ全体のチャンクを対象にRAG回答する"""
        user_likes = set(await self.paper_repository.get_user_likes(owner_uid))

        if req.paper_ids:
            target_paper_ids = user_likes.intersection(req.paper_ids)
            if len(target_paper_ids) != len(set(req.paper_ids)):
                raise HTTPException(
                    status_code=403,
                    detail="some requested paper ids are not in your library",
                )
        else:
            target_paper_ids = user_likes

        if not target_paper_ids:
            return LibraryAskResponse(
                answer="ライブラリに参照可能な論文がありません。",
                confidence=0.0,
                citations=[],
            )

        question = req.question.strip()
        if not question:
            raise HTTPException(status_code=400, detail="question is required")

        query_vector = generate_embedding(question)
        if not query_vector:
            raise HTTPException(status_code=503, detail="embedding generation failed")

        candidate_chunks = await self._search_by_vector(
            query_vector=query_vector,
            target_paper_ids=target_paper_ids,
            top_k=req.top_k,
        )
        if not candidate_chunks:
            fallback = await self._fallback_keyword_search(
                question=question,
                target_paper_ids=target_paper_ids,
                top_k=req.top_k,
            )
            if fallback:
                candidate_chunks = fallback

        if not candidate_chunks:
            return LibraryAskResponse(
                answer="関連する根拠を見つけられませんでした。質問を言い換えるか、対象論文を増やして再実行してください。",
                confidence=0.15,
                citations=[],
            )

        ranked = candidate_chunks[: req.top_k]
        context = []
        citations: list[LibraryAskCitation] = []
        for i, chunk in enumerate(ranked, start=1):
            snippet = chunk["text"][:700].strip()
            context.append(
                f"[{i}] paper={chunk['paper_id']} chunk={chunk['chunk_id']} "
                f"page={chunk['page_range']} score={chunk['score']:.4f}\n{snippet}"
            )
            citations.append(
                LibraryAskCitation(
                    paper_id=chunk["paper_id"],
                    chunk_id=chunk["chunk_id"],
                    score=chunk["score"],
                    page_range=chunk["page_range"],
                    snippet=snippet,
                )
            )

        answer = await self._ask_llm(
            question=question,
            context="\n\n".join(context),
            max_chars=2000,
        )
        scores = [chunk["score"] for chunk in ranked]
        if scores:
            confidence = max(0.2, min(0.95, sum(scores) / len(scores)))
        else:
            confidence = 0.2

        return LibraryAskResponse(answer=answer, confidence=confidence, citations=citations)

    async def _search_by_vector(
        self,
        query_vector: list[float],
        target_paper_ids: set[str],
        top_k: int,
    ) -> list[dict]:
        if not self.vector_enabled:
            return []

        target_ids = list(target_paper_ids)
        fetch_count = min(top_k * 8, 100)
        try:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                self.executor, self._query_neighbors_sync, query_vector, fetch_count
            )
        except Exception as exc:
            logger.error(f"Vector search failed: {exc}")
            return []

        candidate = self._extract_neighbors(response)
        if not candidate:
            return []

        chunk_map = await self._fetch_chunks_for_ids(
            [c[0] for c in candidate],
            target_ids=target_ids,
        )
        merged: list[dict] = []
        for chunk_id, score in candidate:
            chunk = chunk_map.get(chunk_id)
            if not chunk:
                continue
            if chunk["paper_id"] not in target_ids:
                continue
            merged.append(
                {
                    **chunk,
                    "score": float(score),
                }
            )

        merged.sort(key=lambda c: c["score"], reverse=True)
        return merged

    def _query_neighbors_sync(self, query_vector: list[float], top_k: int):
        index_endpoint_cls = getattr(
            aiplatform,
            "MatchingEngineIndexEndpoint",
            getattr(aiplatform, "IndexEndpoint", None),
        )
        if index_endpoint_cls is None:
            raise AttributeError("No matching index endpoint client found in aiplatform")

        my_index_endpoint = index_endpoint_cls(
            index_endpoint_name=self.index_endpoint_name
        )
        return my_index_endpoint.find_neighbors(
            deployed_index_id=self.deployed_index_id,
            queries=[query_vector],
            num_neighbors=top_k,
        )

    def _extract_neighbors(self, response) -> list[tuple[str, float]]:
        if not response:
            return []

        raw_neighbors = response
        if isinstance(response, (list, tuple)) and response:
            raw_neighbors = response[0]

        if hasattr(raw_neighbors, "neighbors"):
            raw_neighbors = raw_neighbors.neighbors
        elif isinstance(raw_neighbors, dict) and "neighbors" in raw_neighbors:
            raw_neighbors = raw_neighbors["neighbors"]

        results: list[tuple[str, float]] = []
        for n in raw_neighbors or []:
            if isinstance(n, dict):
                chunk_id = n.get("datapoint_id") or n.get("id")
                score = n.get("distance", n.get("score", 0.0))
            else:
                chunk_id = getattr(n, "datapoint_id", None) or getattr(n, "id", None)
                score = getattr(n, "distance", getattr(n, "score", 0.0))
            if chunk_id:
                results.append((str(chunk_id), float(score)))
        return results

    async def _fetch_chunks_for_ids(
        self,
        chunk_ids: list[str],
        target_ids: set[str] | None = None,
    ) -> dict[str, dict]:
        if not chunk_ids:
            return {}

        results: dict[str, dict] = {}
        target_chunks = set(chunk_ids)

        # Fast path: scan only papers in user's library if available.
        if target_ids:
            for paper_id in target_ids:
                chunks_ref = (
                    self.db.collection("papers")
                    .document(paper_id)
                    .collection("chunks")
                )
                async for doc in chunks_ref.stream():
                    chunk_id = doc.id
                    if chunk_id not in target_chunks:
                        continue

                    data = doc.to_dict() or {}
                    results[chunk_id] = {
                        "chunk_id": chunk_id,
                        "paper_id": paper_id,
                        "text": data.get("text", ""),
                        "page_range": _to_page_range(
                            int(data.get("pageNumber", 1))
                            if data.get("pageNumber") is not None
                            else 1
                        ),
                        "start_char_idx": data.get("start_char_idx"),
                        "end_char_idx": data.get("end_char_idx"),
                    }
            return results

        # Fallback: collection group query (used only when target_ids is unavailable)
        for batch in _chunked(list(dict.fromkeys(chunk_ids)), 10):
            query = self.db.collection_group("chunks").where(
                field_path="chunkId",
                op_string="in",
                value=batch,
            )
            async for doc in query.stream():
                data = doc.to_dict() or {}
                chunk_id = data.get("chunkId", doc.id)
                if chunk_id not in target_chunks:
                    continue
                paper_id = data.get("paperId")
                if not paper_id:
                    path = doc.reference.path.split("/")
                    if len(path) >= 2:
                        paper_id = path[1]
                results[chunk_id] = {
                    "chunk_id": chunk_id,
                    "paper_id": paper_id,
                    "text": data.get("text", ""),
                    "page_range": _to_page_range(
                        int(data.get("pageNumber", 1))
                        if data.get("pageNumber") is not None
                        else 1
                    ),
                    "start_char_idx": data.get("start_char_idx"),
                    "end_char_idx": data.get("end_char_idx"),
                }
        return results

    async def _get_chunks_for_paper(self, paper_id: str) -> list[dict]:
        chunks_ref = (
            self.db.collection("papers")
            .document(paper_id)
            .collection("chunks")
        )
        result = []
        async for doc in chunks_ref.stream():
            data = doc.to_dict() or {}
            chunk_id = data.get("chunkId", doc.id)
            result.append(
                {
                    "chunk_id": chunk_id,
                    "paper_id": paper_id,
                    "text": data.get("text", ""),
                    "page_range": _to_page_range(
                        int(data.get("pageNumber", 1))
                        if data.get("pageNumber") is not None
                        else 1
                    ),
                    "start_char_idx": data.get("start_char_idx"),
                    "end_char_idx": data.get("end_char_idx"),
                }
            )
        result.sort(key=lambda c: (c["page_range"][0], c["chunk_id"]))
        return result

    async def _get_chunk_by_id(self, chunk_id: str, paper_id: str | None = None) -> dict | None:
        if paper_id:
            chunk_query = (
                self.db.collection("papers")
                .document(paper_id)
                .collection("chunks")
                .document(chunk_id)
                .get()
            )
            doc = await chunk_query
            if doc.exists:
                data = doc.to_dict() or {}
                return {
                    "chunk_id": data.get("chunkId", doc.id),
                    "paper_id": paper_id,
                    "text": data.get("text", ""),
                    "page_range": _to_page_range(
                        int(data.get("pageNumber", 1))
                        if data.get("pageNumber") is not None
                        else 1
                    ),
                    "start_char_idx": data.get("start_char_idx"),
                    "end_char_idx": data.get("end_char_idx"),
                }
            return None

        chunks = await self._fetch_chunks_for_ids([chunk_id])
        return chunks.get(chunk_id)

    async def _fallback_keyword_search(
        self,
        question: str,
        target_paper_ids: set[str],
        top_k: int,
    ) -> list[dict]:
        tokens = await self._extract_fallback_tokens(question)
        if not tokens:
            return []

        candidates: list[tuple[dict, float]] = []
        for paper_id in target_paper_ids:
            chunks = await self._get_chunks_for_paper(paper_id)
            for chunk in chunks:
                text = chunk.get("text", "").lower()
                if not text:
                    continue
                compact_text = text.replace(" ", "")
                match = 0
                for t in tokens:
                    if t and t in text:
                        match += 1
                        continue

                    compact_t = re.sub(r"\s+", "", t)
                    if compact_t and compact_t in compact_text:
                        match += 1
                if match == 0:
                    continue
                score = match / max(len(tokens), 1)
                candidates.append((chunk, score))

        candidates.sort(key=lambda x: x[1], reverse=True)
        results: list[dict] = []
        for chunk, score in candidates[:top_k]:
            chunk = {**chunk, "score": float(score)}
            results.append(chunk)
        return results

    async def _extract_fallback_tokens(self, question: str) -> set[str]:
        q = question.strip().lower()
        if not q:
            return set()

        tokens: set[str] = set()
        tokens.update(re.findall(r"[a-zA-Z0-9][a-zA-Z0-9\-_.]{1,}", q))
        tokens.update(re.findall(r"[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]{2,}", q))

        has_latin_query = bool(re.search(r"[a-zA-Z]", q))
        if not has_latin_query and tokens:
            translated_terms = await self._translate_query_to_english_terms(q)
            tokens.update(translated_terms)

        if not tokens:
            compact = re.sub(r"\s+", "", q)
            if compact:
                tokens.add(compact)

        # Remove one-char noisy tokens
        return {token for token in tokens if len(token) >= 2}

    async def _translate_query_to_english_terms(self, question: str) -> set[str]:
        model = getattr(gemini_client, "model", None)
        if model is None:
            return set()

        prompt = (
            "You are helping with document retrieval. "
            "Translate the following question into 5-8 English keywords only, "
            "comma separated, without explanations.\n"
            f"Question: {question}"
        )

        try:
            response = await model.generate_content_async(prompt)
            text = (response.text or "").lower()
            parts = re.split(r"[,\n;]+", text)
            terms = set()
            for part in parts:
                cleaned = re.sub(r"[^a-z0-9 \\-]", "", part.strip())
                cleaned_terms = [t.strip() for t in cleaned.split(" ") if len(t.strip()) >= 2]
                terms.update(cleaned_terms)
            return terms
        except Exception as exc:
            logger.debug(f"Fallback query translation failed: {exc}")
            return set()

    async def _ask_llm(self, question: str, context: str, max_chars: int = 1200) -> str:
        if not context:
            return "該当する根拠が不足しているため回答を生成できませんでした。"

        model = getattr(gemini_client, "model", None)
        if model is None:
            return (
                f"질문: {question}\n"
                f"근거: {context[:max_chars]}\n"
                f"上記の内容を要約してください。"
            )

        prompt = (
            "あなたは学術文献の読解アシスタントです。\n"
            "以下の「根拠テキスト」だけを使って、質問に答えてください。\n"
            "根拠が不足している場合は明確に『根拠不足』と明記してください。\n"
            "回答は簡潔に、主張には根拠を接続した形で書いてください。\n\n"
            f"質問: {question}\n\n"
            f"根拠テキスト:\n{context[:3000]}\n\n"
            f"文字数上限: {max_chars}字程度"
        )

        try:
            response = await model.generate_content_async(prompt)
            return (response.text or "").strip() if response.text else (
                "根拠が不足しているため、回答を生成できませんでした。"
            )
        except Exception as exc:
            logger.warning(f"Gemini answer generation failed: {exc}")
            return (
                "回答生成に失敗しました。"
                "根拠テキスト内の以下の内容を手がかりに再試行してください。\n\n"
                f"{context[:max_chars]}"
            )


reading_service = ReadingService()
