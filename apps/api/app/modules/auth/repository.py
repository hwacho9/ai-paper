"""
D-01: 認証 & ユーザー - リポジトリ（Firestore操作）

usersコレクションに対するCRUD操作を提供します。
ドキュメントIDはFirebase Auth UIDを使用します。
"""

from datetime import datetime, timezone

from google.cloud.firestore import AsyncClient

from app.core.firestore import get_firestore_client


class AuthRepository:
    """usersコレクションのCRUD操作"""

    COLLECTION = "users"

    def _get_db(self) -> AsyncClient:
        return get_firestore_client()

    async def get_by_uid(self, uid: str) -> dict | None:
        """uidでユーザードキュメントを取得"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(uid)
        doc = await doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            return {
                "uid": uid,
                "email": data.get("email", ""),
                "display_name": data.get("displayName", ""),
                "research_fields": data.get("researchFields", []),
                "preferences": data.get("preferences", {}),
                "created_at": data.get("createdAt"),
                "updated_at": data.get("updatedAt"),
            }
        return None

    async def create(self, uid: str, data: dict) -> dict:
        """ユーザードキュメントを作成（ドキュメントID = uid）"""
        now = datetime.now(timezone.utc)
        
        # Firestoreにはキャメルケースで保存（スキーマ定義準拠）
        doc_data = {
            "uid": uid,
            "email": data.get("email", ""),
            "displayName": data.get("display_name", data.get("name", "")),
            "researchFields": [],
            "preferences": {},
            "createdAt": now,
            "updatedAt": now,
        }
        
        doc_ref = self._get_db().collection(self.COLLECTION).document(uid)
        await doc_ref.set(doc_data)
        
        # アプリケーション内ではスネークケースで返す
        return {
            "uid": uid,
            "email": doc_data["email"],
            "display_name": doc_data["displayName"],
            "research_fields": doc_data["researchFields"],
            "preferences": doc_data["preferences"],
            "created_at": doc_data["createdAt"],
            "updated_at": doc_data["updatedAt"],
        }

    async def update(self, uid: str, data: dict) -> dict:
        """ユーザードキュメントを部分更新"""
        update_data = {}
        if "display_name" in data and data["display_name"] is not None:
            update_data["displayName"] = data["display_name"]
        if "research_fields" in data and data["research_fields"] is not None:
            update_data["researchFields"] = data["research_fields"]
        if "preferences" in data and data["preferences"] is not None:
            update_data["preferences"] = data["preferences"]
            
        if update_data:
            update_data["updatedAt"] = datetime.now(timezone.utc)
            doc_ref = self._get_db().collection(self.COLLECTION).document(uid)
            await doc_ref.update(update_data)

        # 更新後のドキュメントを返す
        return await self.get_by_uid(uid)
