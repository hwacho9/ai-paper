import httpx
import xml.etree.ElementTree as ET
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.search.base import BaseSearchClient, SearchResult

class ArxivClient(BaseSearchClient):
    BASE_URL = "https://export.arxiv.org/api/query"

    def __init__(self):
        # ArXiv API Guideline: max 1 req / 3 sec is recommended
        super().__init__(interval=3.0)
        self._cache = {}
        self._cache_ttl = 3600  # 1 hour

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        cache_key = f"{query}:{limit}"
        now = time.time()
        
        # Check cache
        if cache_key in self._cache:
            data, timestamp = self._cache[cache_key]
            if now - timestamp < self._cache_ttl:
                return data
            else:
                del self._cache[cache_key]

        await self._wait_for_rate_limit()
        
        results = await self._fetch_with_retry(query, limit)
        
        # Update cache
        self._cache[cache_key] = (results, now)
        return results

    @retry(
        retry=retry_if_exception_type(httpx.HTTPStatusError),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def _fetch_with_retry(self, query: str, limit: int) -> list[SearchResult]:
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": limit,
            "sortBy": "relevance",
            "sortOrder": "descending"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL, params=params, timeout=30.0, follow_redirects=True)
            response.raise_for_status()
            return self._parse_response(response.text)

    def _parse_response(self, xml_data: str) -> list[SearchResult]:
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
        
        results = []
        for entry in root.findall('atom:entry', ns):
            # Title
            title = entry.find('atom:title', ns).text.strip().replace('\n', ' ')
            
            # Authors
            authors = [a.find('atom:name', ns).text for a in entry.findall('atom:author', ns)]
            
            # Year (Published)
            published = entry.find('atom:published', ns).text
            year = int(published[:4]) if published else None
            
            # Abstract
            summary = entry.find('atom:summary', ns).text.strip().replace('\n', ' ')
            
            # Links (PDF & DOI)
            pdf_url = None
            doi = None
            for link in entry.findall('atom:link', ns):
                if link.attrib.get('title') == 'pdf':
                    pdf_url = link.attrib.get('href')
                if link.attrib.get('title') == 'doi':
                    doi = link.attrib.get('href').replace('http://dx.doi.org/', '')

            # ArXiv ID
            id_url = entry.find('atom:id', ns).text
            arxiv_id = id_url.split('/abs/')[-1]
            
            # External IDs
            external_ids = {"ArXiv": arxiv_id}
            if doi:
                external_ids["DOI"] = doi
            
            # Venue
            primary_category = entry.find('arxiv:primary_category', ns)
            venue = f"arXiv:{primary_category.attrib['term']}" if primary_category is not None else "arXiv"

            results.append(SearchResult(
                title=title,
                authors=authors,
                year=year,
                venue=venue,
                abstract=summary,
                external_ids=external_ids,
                pdf_url=pdf_url,
                source="arxiv"
            ))
            
        return results
