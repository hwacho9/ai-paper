"""
Semantic Scholar API Client

Docs: https://api.semanticscholar.org/api-docs/graph
"""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

class SemanticScholarClient:
    BASE_URL = "https://api.semanticscholar.org/graph/v1"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key
        self.headers = {}
        if self.api_key:
            self.headers["x-api-key"] = self.api_key

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def search_papers(
        self, 
        query: str, 
        offset: int = 0, 
        limit: int = 10,
        fields: list[str] = ["paperId", "title", "authors", "year", "venue", "abstract", "externalIds", "citationCount", "openAccessPdf"]
    ) -> dict:
        """
        Search for papers by keyword.
        """
        async with httpx.AsyncClient() as client:
            params = {
                "query": query,
                "offset": offset,
                "limit": limit,
                "fields": ",".join(fields)
            }
            response = await client.get(
                f"{self.BASE_URL}/paper/search",
                params=params,
                headers=self.headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()

    async def get_paper(self, paper_id: str, fields: list[str] | None = None) -> dict:
        """
        Get paper details by ID (Semantic Scholar ID, DOI, ArXiv ID, etc).
        """
        if fields is None:
            fields = ["paperId", "title", "authors", "year", "venue", "abstract", "externalIds", "citationCount", "openAccessPdf"]
            
        async with httpx.AsyncClient() as client:
            params = {
                "fields": ",".join(fields)
            }
            response = await client.get(
                f"{self.BASE_URL}/paper/{paper_id}",
                params=params,
                headers=self.headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()

# Singleton instance (API key to be injected via env in production if needed)
semantic_scholar = SemanticScholarClient()
