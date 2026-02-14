import httpx
import xml.etree.ElementTree as ET
from app.core.search.base import BaseSearchClient, SearchResult

from app.core.config import settings

class PubmedClient(BaseSearchClient):
    BASE_URL_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    BASE_URL_SUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    DB = "pubmed"

    def __init__(self):
        # PubMed API Limit: 3 req/s without key, 10 req/s with key.
        # We use 0.1s (10 req/s) if key exists, otherwise 0.34s (approx 3 req/s)
        self.api_key = settings.pubmed_api_key
        interval = 0.1 if self.api_key else 0.34
        super().__init__(interval=interval)

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        await self._wait_for_rate_limit()
        
        # 1. Search for IDs (esearch)
        ids = await self._search_ids(query, limit)
        if not ids:
            return []
        
        # 2. Get details (esummary)
        # Note: We should ideally rate limit this second call too, 
        # but our simple lock handles "search" as one unit. 
        # If we split calls, we should call wait logic again.
        await self._wait_for_rate_limit() 
        return await self._get_details(ids)

    async def _search_ids(self, query: str, limit: int) -> list[str]:
        params = {
            "db": self.DB,
            "term": query,
            "retmax": limit,
            "retmode": "json"
        }
        if self.api_key:
            params["api_key"] = self.api_key
        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL_SEARCH, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data.get("esearchresult", {}).get("idlist", [])

    async def _get_details(self, ids: list[str]) -> list[SearchResult]:
        params = {
            "db": self.DB,
            "id": ",".join(ids),
            "retmode": "json"
        }
        if self.api_key:
            params["api_key"] = self.api_key
        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL_SUMMARY, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            results = []
            uids = data.get("result", {}).get("uids", [])
            for uid in uids:
                item = data["result"][uid]
                
                # Extract fields
                title = item.get("title", "")
                authors = [a.get("name") for a in item.get("authors", [])]
                pub_date = item.get("pubdate", "")
                year = int(pub_date.split()[0]) if pub_date else None
                venue = item.get("source", "")
                doi = next((id["value"] for id in item.get("elocationid", []) if id.get("etype") == "doi"), None) # Sometimes here
                if not doi:
                     # Check articleids
                    for aid in item.get("articleids", []):
                        if aid.get("idtype") == "doi":
                            doi = aid.get("value")
                            break

                external_ids = {"PubMed": uid}
                if doi:
                    external_ids["DOI"] = doi
                
                # Abstract (esummary JSON doesn't always contain abstract properly, might need efetch XML for full abstract)
                # For MVP, we use title or partial info if available. 
                # Ideally, we should use EFETCH for abstracts, but JSON output of efetch is not standard.
                # Let's start with empty abstract or title as fallback.
                abstract = "" 

                # PDF URL (PubMed doesn't give direct PDF url easily)
                pdf_url = None
                
                results.append(SearchResult(
                    title=title,
                    authors=authors,
                    year=year,
                    venue=venue,
                    abstract=abstract,
                    external_ids=external_ids,
                    pdf_url=pdf_url,
                    source="pubmed"
                ))
            return results
