import asyncio
import sys
import os

# appモジュールを見つけるためにパスを追加
sys.path.insert(0, "/app")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../"))

from app.core.config import settings
from google.cloud import firestore

async def sync_keywords():
    """
    全ユーザーの更新スクリプト
    """
    print(f"Project: {settings.gcp_project_id}")
    db = firestore.AsyncClient(
        project=settings.gcp_project_id,
        database=settings.firestore_db,
    )

    print("Fetching users...")
    users_ref = db.collection("users")
    async for user_doc in users_ref.stream():
        uid = user_doc.id
        print(f"Processing user: {uid}")

        # Get likes
        likes_ref = user_doc.reference.collection("likes")
        async for like_doc in likes_ref.stream():
            paper_id = like_doc.id
            if not paper_id:
                print(f"  Warning: Invalid like document {like_doc.id}")
                continue
                
            print(f"  Checking paper: {paper_id}")
            
            # Subcollection check
            paper_ref = db.collection("papers").document(paper_id)
            # Check if paper exists
            paper_snap = await paper_ref.get()
            if not paper_snap.exists:
                print(f"    Paper not found: {paper_id}")
                continue

            # Fetch keywords from subcollection
            keywords_ref = paper_ref.collection("keywords")
            keywords = []
            prerequisite_keywords = []
            has_subcollection = False
            
            async for kw_doc in keywords_ref.stream():
                has_subcollection = True
                kw_data = kw_doc.to_dict()
                
                keyword_id = kw_data.get("keywordId")
                if not keyword_id:
                    continue
                    
                # Keyword definition
                keyword_main_doc = await db.collection("keywords").document(keyword_id).get()
                if not keyword_main_doc.exists:
                    continue
                
                # Verify keyword owner matches user (Private keywords)
                # If keyword is owned by this user, we use it.
                # If keyword is owned by someone else? (Shouldn't happen in subcollection logic usually)
                kw_def = keyword_main_doc.to_dict()
                if kw_def.get("ownerUid") != uid:
                   continue

                label = kw_def.get("label", "")
                if not label:
                    continue
                    
                reason = kw_data.get("reason", "")
                if "prerequisite" in reason:
                    prerequisite_keywords.append(label)
                else:
                    keywords.append(label)

            if has_subcollection and (keywords or prerequisite_keywords):
                print(f"    Syncing: {len(keywords)} keywords, {len(prerequisite_keywords)} prerequisites")
                await paper_ref.update({
                    "keywords": keywords,
                    "prerequisiteKeywords": prerequisite_keywords
                })
            else:
                print("    No keywords found to sync.")

    print("Sync completed!")

if __name__ == "__main__":
    asyncio.run(sync_keywords())
