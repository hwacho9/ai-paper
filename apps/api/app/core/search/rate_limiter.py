import asyncio
import time
import logging
from google.cloud import firestore
from app.core.firestore import get_firestore_client

logger = logging.getLogger(__name__)

class FirestoreRateLimiter:
    """
    Global Rate Limiter using Firestore.
    Ensures that requests to external services are limited across all instances.
    """
    
    COLLECTION_NAME = "sys"
    DOCUMENT_ID = "rate_limits"

    def __init__(self):
        self.db = get_firestore_client()
        self.doc_ref = self.db.collection(self.COLLECTION_NAME).document(self.DOCUMENT_ID)

    async def acquire(self, service_key: str, interval: float):
        """
        Acquire permission to send a request for the given service.
        If the interval has not passed since the last request, this method will sleep.
        
        Args:
            service_key: The key identifying the service (e.g., "arxiv", "pubmed").
            interval: The minimum time (seconds) required between requests.
        """
        while True:
            wait_time = await self._try_acquire(service_key, interval)
            
            if wait_time <= 0:
                # Successfully acquired
                return
            
            # Rate limit hit, wait and retry
            logger.info(f"Rate limit for {service_key}: waiting {wait_time:.2f}s")
            await asyncio.sleep(wait_time)

    async def _try_acquire(self, service_key: str, interval: float) -> float:
        """
        Try to acquire the lock.
        Returns:
            0.0 if acquired.
            > 0.0 (wait time in seconds) if rate limited.
        """
        transaction = self.db.transaction()
        doc_ref = self.doc_ref

        @firestore.async_transactional
        async def update_in_transaction(transaction, doc_ref):
            snapshot = await doc_ref.get(transaction=transaction)
            
            now = time.time()
            data = snapshot.to_dict() if snapshot.exists else {}
            
            last_request_time = data.get(service_key, 0.0)
            elapsed = now - last_request_time
            
            if elapsed < interval:
                # Calculate how long to wait
                wait_necessary = interval - elapsed
                return wait_necessary
            
            # Safe to proceed, update timestamp
            transaction.set(doc_ref, {service_key: now}, merge=True)
            return 0.0

        return await update_in_transaction(transaction, doc_ref)
