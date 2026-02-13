"""
D-04: 論文検索 - サービス
"""
from app.core.semantic_scholar import SemanticScholarClient
from app.core.gemini import gemini_client
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse
from fastapi import HTTPException

class SearchService:
    def __init__(self):
        self.api_client = SemanticScholarClient()
        self.gemini_client = gemini_client

    async def search_papers(self, query: str, limit: int = 20, offset: int = 0) -> SearchResultListResponse:
        """
        論文を検索し、内部スキーマに正規化して返す。
        Semantic Scholarが利用できない場合はGeminiでフォールバックする。
        """
        source = "semantic_scholar"
        raw_data = {}
        
        try:
            # Try Semantic Scholar first
            raw_data = await self.api_client.search_papers(query, offset=offset, limit=limit)
        except Exception as e:
            print(f"Semantic Scholar API Error: {e}")
            
            # Fallback to Gemini if configured
            if self.gemini_client.api_key:
                try:
                    print("Falling back to Gemini...")
                    raw_data = await self.gemini_client.search_papers(query, limit=limit)
                    source = "gemini"
                except Exception as gemini_e:
                    print(f"Gemini API Error: {gemini_e}")
                    # If both fail, raise the original error (or appropriate status)
                    if "429" in str(e):
                         raise HTTPException(status_code=429, detail="検索APIのレート制限に達しました。")
                    raise HTTPException(status_code=503, detail="検索サービスが利用できません。")
            else:
                # No fallback key
                if "429" in str(e):
                    raise HTTPException(status_code=429, detail="検索APIのレート制限に達しました。")
                raise HTTPException(status_code=503, detail="検索サービスが一時的に利用できません。")

        items = []
        for paper in raw_data.get("data", []):
            items.append(self._normalize_paper(paper, source))

        return SearchResultListResponse(
            results=items,
            total=raw_data.get("total", 0),
            offset=offset,
            limit=limit
        )

    def _normalize_paper(self, paper: dict, source: str) -> SearchResultItem:
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

        # Gemini returns dummy IDs, might want to generate UUIDs if saving?
        # For now, we trust the source's ID or generate a temp one.
        paper_id = paper.get("paperId")
        if not paper_id and source == "gemini":
            import uuid
            paper_id = f"gen-{uuid.uuid4()}"

        return SearchResultItem(
            external_id=paper_id,
            source=source,
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
