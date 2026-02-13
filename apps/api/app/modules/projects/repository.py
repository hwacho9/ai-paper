"""D-02: プロジェクト - リポジトリ"""

from datetime import datetime, timezone
from google.cloud.firestore import AsyncClient
from app.core.firestore import get_firestore_client


class ProjectRepository:
    """projectsコレクションのCRUD操作"""

    COLLECTION = "projects"
    PAPERS_SUBCOLLECTION = "papers"

    def _get_db(self) -> AsyncClient:
        return get_firestore_client()

    async def create(self, data: dict) -> dict:
        """プロジェクト作成"""
        now = datetime.now(timezone.utc)
        doc_data = {
            "ownerUid": data["owner_uid"],
            "title": data["title"],
            "description": data.get("description", ""),
            "paperCount": 0,
            "status": "active",
            "createdAt": now,
            "updatedAt": now,
        }
        doc_ref = self._get_db().collection(self.COLLECTION).document()
        await doc_ref.set(doc_data)
        return self._to_snake(doc_data, doc_ref.id)

    async def get_by_id(self, project_id: str, owner_uid: str) -> dict | None:
        """プロジェクト取得（ownerUid検証）"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(project_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        if data.get("ownerUid") != owner_uid:
            return None
        return self._to_snake(data, project_id)

    async def list_by_owner(self, owner_uid: str) -> list[dict]:
        """オーナーのプロジェクト一覧"""
        query = (
            self._get_db()
            .collection(self.COLLECTION)
            .where("ownerUid", "==", owner_uid)
        )
        results = []
        async for doc in query.stream():
            results.append(self._to_snake(doc.to_dict(), doc.id))
        # Python側でupdatedAtの降順ソート
        results.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
        return results

    async def update(self, project_id: str, owner_uid: str, data: dict) -> dict | None:
        """プロジェクト更新"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(project_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None
        existing = doc.to_dict()
        if existing.get("ownerUid") != owner_uid:
            return None

        update_data = {"updatedAt": datetime.now(timezone.utc)}
        if "title" in data:
            update_data["title"] = data["title"]
        if "description" in data:
            update_data["description"] = data["description"]

        await doc_ref.update(update_data)
        updated_doc = await doc_ref.get()
        return self._to_snake(updated_doc.to_dict(), project_id)

    async def delete(self, project_id: str, owner_uid: str) -> bool:
        """プロジェクト削除"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(project_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        if doc.to_dict().get("ownerUid") != owner_uid:
            return False

        # サブコレクション(papers)も削除
        async for paper_doc in doc_ref.collection(self.PAPERS_SUBCOLLECTION).stream():
            await paper_doc.reference.delete()

        await doc_ref.delete()
        return True

    async def add_paper(self, project_id: str, paper_data: dict) -> dict:
        """参照論文追加"""
        now = datetime.now(timezone.utc)
        paper_id = paper_data["paper_id"]
        doc_ref = (
            self._get_db()
            .collection(self.COLLECTION)
            .document(project_id)
            .collection(self.PAPERS_SUBCOLLECTION)
            .document(paper_id)
        )
        doc_data = {
            "paperId": paper_id,
            "note": paper_data.get("note", ""),
            "role": paper_data.get("role", "reference"),
            "addedAt": now,
        }
        await doc_ref.set(doc_data)

        # paperCount をインクリメント & updatedAt を更新
        from google.cloud.firestore_v1 import transforms
        await self._get_db().collection(self.COLLECTION).document(project_id).update({
            "paperCount": transforms.Increment(1),
            "updatedAt": now,
        })
        return {"paper_id": paper_id, "note": doc_data["note"], "role": doc_data["role"]}

    async def remove_paper(self, project_id: str, paper_id: str) -> bool:
        """参照論文削除"""
        doc_ref = (
            self._get_db()
            .collection(self.COLLECTION)
            .document(project_id)
            .collection(self.PAPERS_SUBCOLLECTION)
            .document(paper_id)
        )
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        await doc_ref.delete()

        # paperCount をデクリメント & updatedAt を更新
        from google.cloud.firestore_v1 import transforms
        await self._get_db().collection(self.COLLECTION).document(project_id).update({
            "paperCount": transforms.Increment(-1),
            "updatedAt": datetime.now(timezone.utc),
        })
        return True

    async def get_project_papers(self, project_id: str) -> list[dict]:
        """プロジェクトの参照論文一覧"""
        papers = []
        async for doc in (
            self._get_db()
            .collection(self.COLLECTION)
            .document(project_id)
            .collection(self.PAPERS_SUBCOLLECTION)
            .stream()
        ):
            data = doc.to_dict()
            papers.append({
                "paper_id": doc.id,
                "note": data.get("note", ""),
                "role": data.get("role", "reference"),
                "added_at": data.get("addedAt"),
            })
        return papers

    def _to_snake(self, data: dict, project_id: str) -> dict:
        """Firestore camelCase -> Python snake_case"""
        return {
            "id": project_id,
            "owner_uid": data.get("ownerUid", ""),
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "status": data.get("status", "active"),
            "created_at": data.get("createdAt"),
            "updated_at": data.get("updatedAt"),
            "paper_count": data.get("paperCount", 0),
        }
