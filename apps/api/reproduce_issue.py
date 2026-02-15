
import asyncio
import httpx
from app.core.search.pubmed import PubmedClient
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)

async def main():
    client = PubmedClient()
    print("Searching for 'BIO'...")
    results = await client.search("BIO", limit=5)
    
    print(f"\nFound {len(results)} results")
    for r in results:
        print(f"Title: {r.title}")
        print(f"External IDs: {r.external_ids}")
        print(f"PDF URL: {r.pdf_url}")
        print(f"URL: {r.url}")
        print("-" * 20)
        
    # Wait a bit to respect rate limits if running continuously
    await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
