import asyncio
import time
from abc import ABC, abstractmethod
from pydantic import BaseModel

class SearchResult(BaseModel):
    title: str
    authors: list[str]
    year: int | None = None
    venue: str = ""
    abstract: str = ""
    external_ids: dict[str, str] = {} # {"ArXiv": "...", "DOI": "..."}
    pdf_url: str | None = None
    url: str | None = None
    citation_count: int | None = None
    source: str

from app.core.search.rate_limiter import FirestoreRateLimiter

class BaseSearchClient(ABC):
    def __init__(self, interval: float = 1.0, rate_limiter: FirestoreRateLimiter = None):
        self._interval = interval
        # If no global rate limiter provided, fall back to simple local one (not recommended for production)
        # But we will ensure it is provided.
        self._rate_limiter = rate_limiter
        self._last_request_time = 0.0
        self._lock = asyncio.Lock()
        
        # Determine service key from class name or other property if needed, 
        # but better to pass it or define it in subclass. 
        # For now we will assume subclass sets `self.service_name` or similar.
        # Let's standardize on a `SERVICE_KEY` class attribute.

    @property
    @abstractmethod
    def SERVICE_KEY(self) -> str:
        pass

    async def _wait_for_rate_limit(self):
        """Rate Limiter: Ensures interval between requests"""
        if self._rate_limiter:
            await self._rate_limiter.acquire(self.SERVICE_KEY, self._interval)
        else:
            # Fallback to local
            async with self._lock:
                now = time.time()
                elapsed = now - self._last_request_time
                if elapsed < self._interval:
                    wait_time = self._interval - elapsed
                    await asyncio.sleep(wait_time)
                self._last_request_time = time.time()

    @abstractmethod
    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        """
        Search for papers.
        Must call await self._wait_for_rate_limit() before making request.
        """
        pass
