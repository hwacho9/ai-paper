"""
D-08: メモ & ノート - リポジトリ
"""
from datetime import datetime, timezone
import uuid
from google.cloud.firestore import AsyncClient
from app.core.firestore import get_firestore_client
from app.modules.memos.schemas import MemoCreate, MemoRef

class MemoRepository:
    COLLECTION = "memos"
    SUB_COLLECTION_REFS = "refs"

    def _get_db(self) -> AsyncClient:
        return get_firestore_client()

    async def create(self, uid: str, data: MemoCreate) -> dict:
        """メモを作成"""
        memo_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        doc_data = {
            "id": memo_id,
            "ownerUid": uid,
            "title": data.title,
            "body": data.body,
            "status": data.status,
            "tags": data.tags,
            "createdAt": now,
            "updatedAt": now,
        }
        
        # メモ本体保存
        doc_ref = self._get_db().collection(self.COLLECTION).document(memo_id)
        await doc_ref.set(doc_data)
        
        # 参照保存 (Sub-collection)
        if data.refs:
            batch = self._get_db().batch()
            refs_col = doc_ref.collection(self.SUB_COLLECTION_REFS)
            for ref in data.refs:
                ref_id = f"{ref.ref_type}_{ref.ref_id}"
                ref_doc = refs_col.document(ref_id)
                batch.set(ref_doc, {
                    "memoId": memo_id,
                    "refType": ref.ref_type,
                    "refId": ref.ref_id,
                    "note": ref.note
                })
            await batch.commit()

        return self._to_snake(doc_data, data.refs)

    async def get_by_uid(self, uid: str) -> list[dict]:
        """ユーザーのメモ一覧を取得"""
        query = self._get_db().collection(self.COLLECTION).where("ownerUid", "==", uid).order_by("updatedAt", direction="DESCENDING")
        docs = await query.stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            # 簡略化のためRefは一覧では取らないか、必要なら別途取得。ここでは空リストで返すパターンもアリだが、
            # Documentのフィールドとして保持していないのでSubCollection取得が必要。
            # いったん一覧ではTagsなどが取れればOKとする。
            results.append(self._to_snake(data, []))
        return results

    async def get_by_id(self, memo_id: str, uid: str) -> dict | None:
        """メモ詳細取得"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(memo_id)
        doc = await doc_ref.get()
        
        if not doc.exists or doc.to_dict().get("ownerUid") != uid:
            return None
            
        data = doc.to_dict()
        
        # Refs取得
        refs_docs = await doc_ref.collection(self.SUB_COLLECTION_REFS).stream()
        refs = []
        for r in refs_docs:
            rd = r.to_dict()
            refs.append(MemoRef(
                ref_type=rd.get("refType"),
                ref_id=rd.get("refId"),
                note=rd.get("note")
            ))
            
        return self._to_snake(data, refs)

    def _to_snake(self, data: dict, refs: list[MemoRef]) -> dict:
        return {
            "id": data.get("id"),
            "owner_uid": data.get("ownerUid"),
            "title": data.get("title", ""),
            "body": data.get("body", ""),
            "status": data.get("status", "draft"),
            "created_at": data.get("createdAt"),
            "updated_at": data.get("updatedAt"),
            "tags": data.get("tags", []),
            "refs": refs
        }
