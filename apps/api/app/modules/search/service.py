"""
D-04: 論文検索 - サービス
"""
from app.core.semantic_scholar import SemanticScholarClient
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse

class SearchService:
    def __init__(self):
        self.api_client = SemanticScholarClient()

    async def search_papers(self, query: str, limit: int = 20, offset: int = 0) -> SearchResultListResponse:
        """
        論文を検索し、内部スキーマに正規化して返す。
        """
        try:
            raw_data = await self.api_client.search_papers(query, offset=offset, limit=limit)
        except Exception as e:
            # Handle rate limits or other API errors
            print(f"Semantic Scholar API Error: {e}")
            from fastapi import HTTPException
            if "429" in str(e):
                raise HTTPException(status_code=429, detail="検索APIのレート制限に達しました。しばらく待ってから再試行してください。")
            raise HTTPException(status_code=503, detail="検索サービスが一時的に利用できません。")

        items = []
        for paper in raw_data.get("data", []):
            items.append(self._normalize_paper(paper))

        return SearchResultListResponse(
            results=items,
            total=raw_data.get("total", 0),
            offset=offset,
            limit=limit
        )

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

        return SearchResultItem(
            external_id=paper.get("paperId"),
            source="semantic_scholar",
            title=paper.get("title", "No Title"),
            authors=authors,
            year=paper.get("year"),
            venue=paper.get("venue", ""),
            abstract=paper.get("abstract") or "",
            doi=doi,
            arxiv_id=arxiv_id,
            pdf_url=pdf_url,
            citation_count=paper.get("citationCount"),
            is_in_library=False # TODO: Check against user library
        )

search_service = SearchService()
