"""
D-04: 論文検索 - サービス
"""
from app.core.gemini import gemini_client
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse
from fastapi import HTTPException

class SearchService:
    def __init__(self):
        self.gemini_client = gemini_client

    async def search_papers(self, query: str, limit: int = 20, offset: int = 0) -> SearchResultListResponse:
        """
        Gemini検索結果を内部スキーマに正規化して返す。
        """
        try:
            raw_data = await self.gemini_client.search_papers(query, limit=limit)
            items = []
            for paper in raw_data.get("data", []):
                items.append(self._normalize_paper(paper))

            return SearchResultListResponse(
                results=items,
                total=raw_data.get("total", 0),
                offset=offset,
                limit=limit
            )
        except Exception as e:
            print(f"Gemini API Error: {e}")
            raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

    def _normalize_paper(self, paper: dict) -> SearchResultItem:
        # Authors
        authors = [a.get("name") for a in paper.get("authors", []) if a.get("name")]
        
        # External IDs
        ext_ids = paper.get("externalIds", {})
        doi = ext_ids.get("DOI")
        arxiv_id = ext_ids.get("ArXiv")
        
        # PDF URL (OpenAccess)
        pdf_url = paper.get("openAccessPdf", {}).get("url") if paper.get("openAccessPdf") else None
        if not pdf_url and arxiv_id:
            pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

        # Geminiの結果にpaperIdがない場合は暫定IDを採番
        paper_id = paper.get("paperId")
        if not paper_id:
            import uuid
            paper_id = f"gen-{uuid.uuid4()}"

        return SearchResultItem(
            external_id=paper_id,
            source="gemini",
            title=paper.get("title", "No Title"),
            authors=authors,
            year=paper.get("year"),
            venue=paper.get("venue", ""),
            abstract=paper.get("abstract") or "",
            doi=doi,
            arxiv_id=arxiv_id,
            pdf_url=pdf_url,
            citation_count=paper.get("citationCount"),
            is_in_library=False 
        )

search_service = SearchService()
