
import asyncio
import httpx
import os

# Mock settings
class Settings:
    pubmed_api_key = os.environ.get("PUBMED_API_KEY")

settings = Settings()

class PubmedClient:
    BASE_URL_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    BASE_URL_SUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    DB = "pubmed"
    SERVICE_KEY = "pubmed"

    def __init__(self):
        self.api_key = settings.pubmed_api_key

    async def search(self, query: str, limit: int = 10):
        print(f"Searching for: {query}")
        ids = await self._search_ids(query, limit)
        print(f"Found IDs: {ids}")
        if not ids:
            return []
        
        details = await self._get_details(ids)
        return details

    async def _search_ids(self, query: str, limit: int) -> list[str]:
        params = {
            "db": self.DB,
            "term": query,
            "retmax": limit,
            "retmode": "json"
        }
        if self.api_key:
            params["api_key"] = self.api_key
        
        print(f"Requesting SEARCH: {self.BASE_URL_SEARCH} with params {params}")
        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL_SEARCH, params=params, timeout=10.0)
            print(f"Search Status: {response.status_code}")
            print(f"Search Response: {response.text[:200]}")
            response.raise_for_status()
            data = response.json()
            return data.get("esearchresult", {}).get("idlist", [])

    async def _get_details(self, ids: list[str]):
        params = {
            "db": self.DB,
            "id": ",".join(ids),
            "retmode": "json"
        }
        if self.api_key:
            params["api_key"] = self.api_key
            
        print(f"Requesting DETAILS: {self.BASE_URL_SUMMARY} with params {params}")
        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL_SUMMARY, params=params, timeout=10.0)
            print(f"Details Status: {response.status_code}")
            print(f"Details Response: {response.text[:200]}")
            response.raise_for_status()
            data = response.json()
            return data

async def main():
    client = PubmedClient()
    # Test with "BIO" as in the user report
    results = await client.search("BIO", limit=5)
    print(f"Results: {results}")

if __name__ == "__main__":
    asyncio.run(main())
