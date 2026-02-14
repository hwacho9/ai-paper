"""D-06: キーワード - リポジトリ"""

from datetime import datetime, timezone
from google.cloud.firestore import AsyncClient

from app.core.firestore import get_firestore_client


class KeywordRepository:
    COLLECTION = "keywords"
    PAPERS_COLLECTION = "papers"
    PAPER_KEYWORDS_SUBCOLLECTION = "keywords"

    def _get_db(self) -> AsyncClient:
        return get_firestore_client()

    async def create(self, owner_uid: str, data: dict) -> dict:
        """キーワード作成"""
        now = datetime.now(timezone.utc)
        doc_data = {
            "ownerUid": owner_uid,
            "label": data.get("label", ""),
            "description": data.get("description", ""),
            "createdAt": now,
            "updatedAt": now,
        }
        doc_ref = self._get_db().collection(self.COLLECTION).document()
        await doc_ref.set(doc_data)
        return self._to_snake(doc_data, doc_ref.id)

    async def get_by_id(self, keyword_id: str, owner_uid: str) -> dict | None:
        """IDでキーワード取得（ownerUid検証）"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(keyword_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        if data.get("ownerUid") != owner_uid:
            return None
        return self._to_snake(data, keyword_id)

    async def get_by_label(self, owner_uid: str, label: str) -> dict | None:
        """同一オーナーの同名キーワード取得"""
        query = (
            self._get_db()
            .collection(self.COLLECTION)
            .where("ownerUid", "==", owner_uid)
            .where("label", "==", label)
            .limit(1)
        )
        async for doc in query.stream():
            return self._to_snake(doc.to_dict(), doc.id)
        return None

    async def list_by_owner(self, owner_uid: str) -> list[dict]:
        """オーナーのキーワード一覧"""
        query = (
            self._get_db()
            .collection(self.COLLECTION)
            .where("ownerUid", "==", owner_uid)
        )
        results = []
        async for doc in query.stream():
            results.append(self._to_snake(doc.to_dict(), doc.id))
        results.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
        return results

    async def update(self, keyword_id: str, owner_uid: str, data: dict) -> dict | None:
        """キーワード更新"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(keyword_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None

        existing = doc.to_dict()
        if existing.get("ownerUid") != owner_uid:
            return None

        update_data = {"updatedAt": datetime.now(timezone.utc)}
        if "label" in data and data["label"] is not None:
            update_data["label"] = data["label"]
        if "description" in data and data["description"] is not None:
            update_data["description"] = data["description"]

        await doc_ref.update(update_data)
        updated_doc = await doc_ref.get()
        return self._to_snake(updated_doc.to_dict(), keyword_id)

    async def delete(self, keyword_id: str, owner_uid: str) -> bool:
        """キーワード削除"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(keyword_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        if doc.to_dict().get("ownerUid") != owner_uid:
            return False

        await doc_ref.delete()
        return True

    async def tag_paper_keyword(
        self,
        paper_id: str,
        keyword_id: str,
        confidence: float,
        source: str = "manual",
    ) -> dict:
        """論文にキーワードを付与（同一keyword_idは上書き）"""
        now = datetime.now(timezone.utc)
        doc_data = {
            "paperId": paper_id,
            "keywordId": keyword_id,
            "confidence": confidence,
            "source": source,
            "createdAt": now,
            "updatedAt": now,
        }
        doc_ref = (
            self._get_db()
            .collection(self.PAPERS_COLLECTION)
            .document(paper_id)
            .collection(self.PAPER_KEYWORDS_SUBCOLLECTION)
            .document(keyword_id)
        )
        await doc_ref.set(doc_data)
        return self._paper_keyword_to_snake(doc_data)

    async def untag_paper_keyword(self, paper_id: str, keyword_id: str) -> bool:
        """論文からキーワードを解除"""
        doc_ref = (
            self._get_db()
            .collection(self.PAPERS_COLLECTION)
            .document(paper_id)
            .collection(self.PAPER_KEYWORDS_SUBCOLLECTION)
            .document(keyword_id)
        )
        doc = await doc_ref.get()
        if not doc.exists:
            return False
        await doc_ref.delete()
        return True

    async def list_paper_keywords(self, paper_id: str, owner_uid: str) -> list[dict]:
        """論文に紐づくキーワード一覧を取得"""
        keywords_ref = (
            self._get_db()
            .collection(self.PAPERS_COLLECTION)
            .document(paper_id)
            .collection(self.PAPER_KEYWORDS_SUBCOLLECTION)
        )

        results: list[dict] = []
        async for doc in keywords_ref.stream():
            data = doc.to_dict()
            keyword_doc = (
                await self._get_db().collection(self.COLLECTION).document(doc.id).get()
            )
            keyword_data = keyword_doc.to_dict() if keyword_doc.exists else {}

            if keyword_data and keyword_data.get("ownerUid") != owner_uid:
                continue

            results.append(
                self._paper_keyword_to_snake(
                    data,
                    label=keyword_data.get("label", ""),
                    description=keyword_data.get("description", ""),
                )
            )

        return results

    def _to_snake(self, data: dict, keyword_id: str) -> dict:
        return {
            "id": keyword_id,
            "owner_uid": data.get("ownerUid", ""),
            "label": data.get("label", ""),
            "description": data.get("description", ""),
            "created_at": data.get("createdAt"),
            "updated_at": data.get("updatedAt"),
        }

    def _paper_keyword_to_snake(
        self,
        data: dict,
        label: str = "",
        description: str = "",
    ) -> dict:
        return {
            "paper_id": data.get("paperId"),
            "keyword_id": data.get("keywordId"),
            "label": label,
            "description": description,
            "confidence": data.get("confidence", 1.0),
            "source": data.get("source", "manual"),
        }
