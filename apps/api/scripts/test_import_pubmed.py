
import asyncio
import sys
import os
import traceback

# Add /app to sys.path if not present
sys.path.append("/app")

try:
    from app.core.search.pubmed import PubmedClient
except ImportError:
    sys.path.append(os.getcwd())
    from app.core.search.pubmed import PubmedClient

async def main():
    print("Initializing PubmedClient...")
    client = PubmedClient()
    print("Calling client.search('BIO')...")
    try:
        res = await client.search("BIO", limit=5)
        print(f"Result count: {len(res)}")
        for r in res:
            print(f" - {r.title}")
    except Exception as e:
        print(f"Error during search: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
