"""
D-04: 論文検索 - サービス
"""
from app.core.semantic_scholar import SemanticScholarClient
from app.core.gemini import gemini_client
from app.core.config import settings
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse
from fastapi import HTTPException

from app.core.search import ArxivClient, PubmedClient, ScholarClient, SearchResult
from app.core.gemini import gemini_client
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse
from fastapi import HTTPException
import uuid

class SearchService:
    def __init__(self):
        self.arxiv = ArxivClient()
        self.pubmed = PubmedClient()
        self.scholar = ScholarClient()
        self.gemini = gemini_client

    async def search_papers(self, query: str, limit: int = 20, offset: int = 0, source: str = "arxiv") -> SearchResultListResponse:
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
            raise HTTPException(status_code=500, detail=f"Search API Error: {str(e)}")

        # Convert to Response Schema
        items = []
        for r in results:
            items.append(self._convert_to_item(r))

        return SearchResultListResponse(
            results=items,
            total=len(items),
            offset=offset,
            limit=limit
        )

    def _convert_to_item(self, result: SearchResult) -> SearchResultItem:
        # ID handling
        paper_id = None
        
        # 1. Try to use external ID as ID
        if result.external_ids.get("ArXiv"):
            paper_id = result.external_ids["ArXiv"]
        elif result.external_ids.get("DOI"):
            # DOI can contain slashes, might need encoding if used in URL path directly.
            # safe to use UUID for system ID and keep DOI as metadata?
            # For now, let's generate UUID to be safe for URL paths if no simple ID.
            pass
            
        if not paper_id:
            paper_id = str(uuid.uuid4())

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
            citation_count=0, # Not available in most simple APIs
            is_in_library=False 
        )

search_service = SearchService()
