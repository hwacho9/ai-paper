import asyncio
import time
import sys
import os

# Ensure the app code is in path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from app.core.search.rate_limiter import FirestoreRateLimiter

async def worker(limiter, worker_id):
    service = "test_limit"
    interval = 1.0
    
    print(f"Worker {worker_id} trying to acquire...")
    start = time.time()
    await limiter.acquire(service, interval)
    end = time.time()
    
    print(f"Worker {worker_id} acquired! Waited: {end - start:.2f}s")
    return end

async def main():
    limiter = FirestoreRateLimiter()
    # Reset for test
    # transaction = limiter.db.transaction() # Simplified reset without transaction for test setup
    await limiter.doc_ref.set({"test_limit": 0.0}, merge=True)

    print("Starting 5 concurrent workers (Interval: 1.0s)...")
    tasks = [worker(limiter, i) for i in range(5)]
    
    start_global = time.time()
    results = await asyncio.gather(*tasks)
    end_global = time.time()
    
    results.sort()
    print("\n--- Results ---")
    previous = 0.0
    for i, t in enumerate(results):
        if i == 0:
            previous = t
            continue
        diff = t - previous
        print(f"Gap between request {i} and {i+1}: {diff:.2f}s")
        if diff < 0.9: # Allow small jitter/clock diffs
            print("❌ FAILED: Gap too small!")
        else:
            print("✅ OK")
        previous = t

    print(f"\nTotal time for 5 requests: {end_global - start_global:.2f}s (Expected ~4-5s)")

if __name__ == "__main__":
    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS") is None:
        print("Warning: GOOGLE_APPLICATION_CREDENTIALS not set. Firestore might fail if not authenticated.")
    
    asyncio.run(main())
