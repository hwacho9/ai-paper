from app.core.search.base import BaseSearchClient, SearchResult
from scholarly import scholarly
import asyncio
from functools import partial

class ScholarClient(BaseSearchClient):
    def __init__(self):
        # Google Scholar is very strict. We use a conservative 2.0s interval 
        # to avoid immediate scraping bans, although scholarly might handle some of it.
        super().__init__(interval=2.0)

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        await self._wait_for_rate_limit()

        # scholarly is synchronous and blocking. Run in executor.
        loop = asyncio.get_running_loop()
        
        # Wrapping generator consumption in thread
        results = await loop.run_in_executor(None, partial(self._search_sync, query, limit))
        return results

    def _search_sync(self, query: str, limit: int) -> list[SearchResult]:
        search_query = scholarly.search_pubs(query)
        results = []
        try:
            for _ in range(limit):
                item = next(search_query)
                bib = item.get('bib', {})
                
                # Extract
                title = bib.get('title', '')
                authors = bib.get('author', [])
                year = int(bib.get('pub_year')) if bib.get('pub_year') else None
                venue = bib.get('venue', 'Google Scholar')
                abstract = bib.get('abstract', '')
                pdf_url = item.get('eprint_url')
                
                # External IDs (Scholar doesn't give DOI easily without extra requests)
                external_ids = {} # might parse from url or check extra fields
                
                results.append(SearchResult(
                    title=title,
                    authors=authors,
                    year=year,
                    venue=venue,
                    abstract=abstract,
                    external_ids=external_ids,
                    pdf_url=pdf_url,
                    source="scholar"
                ))
        except StopIteration:
            pass
        except Exception as e:
            print(f"Scholar Error: {e}")
            
        return results
