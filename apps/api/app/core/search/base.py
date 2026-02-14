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
    source: str

class BaseSearchClient(ABC):
    def __init__(self, interval: float = 1.0):
        self._interval = interval
        self._last_request_time = 0.0
        self._lock = asyncio.Lock()

    async def _wait_for_rate_limit(self):
        """Rate Limiter: Ensures interval between requests"""
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
