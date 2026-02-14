"""
D-03: ペーパーライブラリ - リポジトリ
"""
from datetime import datetime, timezone
from google.cloud.firestore import AsyncClient, Transaction
from app.core.firestore import get_firestore_client

class PaperRepository:
    COLLECTION_PAPERS = "papers"
    COLLECTION_USERS = "users"
    SUB_COLLECTION_LIKES = "likes"

    def _get_db(self) -> AsyncClient:
        return get_firestore_client()

    async def get_by_id(self, paper_id: str) -> dict | None:
        """IDで論文を取得"""
        doc_ref = self._get_db().collection(self.COLLECTION_PAPERS).document(paper_id)
        doc = await doc_ref.get()
        if doc.exists:
            return self._to_snake(doc.to_dict(), paper_id)
        return None

    async def create(self, paper_id: str, data: dict) -> dict:
        """論文を作成（存在しなければ）"""
        doc_ref = self._get_db().collection(self.COLLECTION_PAPERS).document(paper_id)
        
        # 既に存在するか確認（上書きしないポリシー）
        doc = await doc_ref.get()
        if doc.exists:
            return self._to_snake(doc.to_dict(), paper_id)

        now = datetime.now(timezone.utc)
        
        # CamelCase for storage
        doc_data = {
            "id": paper_id,
            "title": data.get("title", ""),
            "authors": data.get("authors", []),
            "year": data.get("year"),
            "venue": data.get("venue", ""),
            "abstract": data.get("abstract", ""),
            "doi": data.get("doi"),
            "arxivId": data.get("arxiv_id"),
            "pdfUrl": data.get("pdf_url"),
            "status": "PENDING",
            "keywords": data.get("keywords", []),
            "prerequisiteKeywords": data.get("prerequisite_keywords", []),
            "createdAt": now,
            "updatedAt": now,
        }
        
        await doc_ref.set(doc_data)
        return self._to_snake(doc_data, paper_id)

    async def update(self, paper_id: str, update_data: dict) -> dict | None:
        """論文のフィールドを部分更新する"""
        doc_ref = self._get_db().collection(self.COLLECTION_PAPERS).document(paper_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None
        
        update_data["updatedAt"] = datetime.now(timezone.utc)
        await doc_ref.update(update_data)
        
        updated_doc = await doc_ref.get()
        return self._to_snake(updated_doc.to_dict(), paper_id)

    async def add_like(self, uid: str, paper_id: str):
        """ユーザーのいいねを追加"""
        now = datetime.now(timezone.utc)
        like_ref = self._get_db().collection(self.COLLECTION_USERS).document(uid).collection(self.SUB_COLLECTION_LIKES).document(paper_id)
        await like_ref.set({
            "paperId": paper_id,
            "createdAt": now
        })

    async def remove_like(self, uid: str, paper_id: str):
        """ユーザーのいいねを解除"""
        like_ref = self._get_db().collection(self.COLLECTION_USERS).document(uid).collection(self.SUB_COLLECTION_LIKES).document(paper_id)
        await like_ref.delete()

    async def get_user_likes(self, uid: str) -> list[str]:
        """ユーザーのいいねした論文IDリストを取得"""
        result = []
        async for doc in self._get_db().collection(self.COLLECTION_USERS).document(uid).collection(self.SUB_COLLECTION_LIKES).stream():
            result.append(doc.id)
        return result

    async def get_papers_by_ids(self, paper_ids: list[str]) -> list[dict]:
        """複数のIDから論文を一括取得"""
        if not paper_ids:
            return []
        
        # Firestore in_query supports max 10, so we might need chunking if list is huge
        # For simple implementations, loop or chunking. Let's start with loop for safety or batches
        # Efficient way: getAll
        refs = [self._get_db().collection(self.COLLECTION_PAPERS).document(pid) for pid in paper_ids]
        
        results = []
        async for doc in self._get_db().get_all(refs):
            if doc.exists:
                results.append(self._to_snake(doc.to_dict(), doc.id))
        return results

    def _to_snake(self, data: dict, paper_id: str) -> dict:
        """Firestore camelCase -> Python snake_case"""
        return {
            "id": paper_id,
            "title": data.get("title", ""),
            "authors": data.get("authors", []),
            "year": data.get("year"),
            "venue": data.get("venue", ""),
            "abstract": data.get("abstract", ""),
            "doi": data.get("doi"),
            "arxiv_id": data.get("arxivId"),
            "pdf_url": data.get("pdfUrl"),
            "status": data.get("status", "PENDING"),
            "keywords": data.get("keywords", []),
            "prerequisite_keywords": data.get("prerequisiteKeywords", []),
            "created_at": data.get("createdAt"),
            "updated_at": data.get("updatedAt"),
        }
