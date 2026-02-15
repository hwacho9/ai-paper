import asyncio
import time
from app.core.search.arxiv import ArxivClient

async def main():
    client = ArxivClient()
    query = "LLM"
    limit = 5

    print(f"--- Starting ArXiv API Rate Limit & Cache Test ---")
    
    # 1. First Request (Should hit API)
    start_time = time.time()
    print(f"\n[1] Making first request for '{query}'...")
    results1 = await client.search(query, limit)
    duration1 = time.time() - start_time
    print(f"    Received {len(results1)} results in {duration1:.2f}s")

    # 2. Second Request (Should hit Cache - Immediate)
    start_time = time.time()
    print(f"\n[2] Making SAME request for '{query}' (Expect Cache Hit)...")
    results2 = await client.search(query, limit)
    duration2 = time.time() - start_time
    print(f"    Received {len(results2)} results in {duration2:.2f}s")
    
    if duration2 < 1.0:
        print("    ✅ Cache Hit Verified (Request took < 1s)")
    else:
        print("    ❌ Cache Miss (Request took too long)")

    # 3. Third Request (Different Query - Should Rate Limit)
    query_diff = "RAG"
    start_time = time.time()
    print(f"\n[3] Making DIFFERENT request for '{query_diff}' (Expect Rate Limit Wait)...")
    results3 = await client.search(query_diff, limit)
    duration3 = time.time() - start_time
    print(f"    Received {len(results3)} results in {duration3:.2f}s")

    if duration3 >= 3.0:
         print("    ✅ Rate Limit Verified (Request took >= 3s)")
    else:
         print(f"    ⚠️ Warning: Request executed fast ({duration3:.2f}s). Check if rate limiter is working or if initial wait time was sufficient.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
