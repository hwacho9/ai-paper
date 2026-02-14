"""
D-04: 論文検索 - サービス
"""
import re
import uuid
import traceback

from app.core.semantic_scholar import SemanticScholarClient
from app.core.gemini import gemini_client
from app.core.config import settings
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse
from fastapi import HTTPException

from app.core.search import ArxivClient, PubmedClient, ScholarClient, SearchResult
from app.core.gemini import gemini_client
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse
from fastapi import HTTPException

class SearchService:
    def __init__(self):
        self.arxiv = ArxivClient()
        self.pubmed = PubmedClient()
        self.scholar = ScholarClient()
        self.gemini = gemini_client

    async def search_papers(self, query: str, limit: int = 20, offset: int = 0, source: str = "arxiv", uid: str | None = None) -> SearchResultListResponse:
        """
        論文を検索する。source引数で検索対象を指定可能。
        valid sources: "arxiv", "pubmed", "scholar", "gemini"
        """
        results: list[SearchResult] = []
        
        try:
            if source == "arxiv":
                results = await self.arxiv.search(query, limit)
            elif source == "pubmed":
                results = await self.pubmed.search(query, limit)
            elif source == "scholar":
                results = await self.scholar.search(query, limit)
            elif source == "gemini":
                # Gemini logic (Legacy/Fallback)
                raw_data = await self.gemini.search_papers(query, limit=limit)
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
                # Default fallback
                results = await self.arxiv.search(query, limit)
                
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
        items = []
        for r in results:
            items.append(self._convert_to_item(r, liked_ids))

        return SearchResultListResponse(
            results=items,
            total=len(items),
            offset=offset,
            limit=limit
        )

    def _convert_to_item(self, result: SearchResult, liked_ids: set[str] | None = None) -> SearchResultItem:
        # ID handling
        paper_id = None
        
        # 1. Try to use external ID as ID
        if result.external_ids.get("ArXiv"):
            arxiv_raw = str(result.external_ids["ArXiv"])
            paper_id = f"arxiv:{self._sanitize_doc_id(arxiv_raw)}"
        elif result.external_ids.get("DOI"):
            doi_raw = str(result.external_ids["DOI"])
            paper_id = f"doi:{self._sanitize_doc_id(doi_raw)}"
            
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

    def _sanitize_doc_id(self, value: str) -> str:
        """
        Firestore ドキュメントIDとして安全な文字に正規化する。
        重要: '/' を含めない。
        """
        safe = value.strip()
        safe = safe.replace("/", "_")
        safe = safe.replace("\\", "_")
        safe = re.sub(r"\s+", "_", safe)
        safe = re.sub(r"[^a-zA-Z0-9._:-]", "_", safe)
        safe = re.sub(r"_+", "_", safe)
        return safe[:240] if safe else str(uuid.uuid4())

search_service = SearchService()
