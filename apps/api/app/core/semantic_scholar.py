"""
Semantic Scholar API Client

Docs: https://api.semanticscholar.org/api-docs/graph
"""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class SemanticScholarClient:
    BASE_URL = "https://api.semanticscholar.org/graph/v1"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key
        self.headers = {}
        if self.api_key:
            self.headers["x-api-key"] = self.api_key

    @retry(
        stop=stop_after_attempt(4),  # 2 -> 4回に増やす
        wait=wait_exponential(multiplier=1, min=2, max=10), # max 5 -> 10s
        retry=retry_if_exception_type(httpx.HTTPStatusError) | retry_if_exception_type(httpx.TimeoutException)
    )
    async def search_papers(
        self, 
        query: str, 
        offset: int = 0, 
        limit: int = 10,
        fields: list[str] | None = None
    ) -> dict:
        """
        Search for papers by keyword.
        """
        if fields is None:
             fields = ["paperId", "title", "authors", "year", "venue", "abstract", "externalIds", "citationCount", "openAccessPdf"]

        async with httpx.AsyncClient() as client:
            params = {
                "query": query,
                "offset": offset,
                "limit": limit,
                "fields": ",".join(fields)
            }
            try:
                response = await client.get(
                    f"{self.BASE_URL}/paper/search",
                    params=params,
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                # 404 (Not Found) はリトライ不要
                if e.response.status_code == 404:
                    return {"data": [], "total": 0}
                raise e

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

from app.core.config import settings

# Singleton instance
semantic_scholar = SemanticScholarClient(api_key=None)
