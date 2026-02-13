"""
D-08: メモ & ノート - リポジトリ
"""
from datetime import datetime, timezone
import uuid
from google.cloud.firestore import AsyncClient
from app.core.firestore import get_firestore_client
from app.modules.memos.schemas import MemoCreate, MemoRef, MemoUpdate


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
        refs_out: list[MemoRef] = []
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
                    "note": ref.note,
                })
                refs_out.append(ref)
            await batch.commit()

        return self._to_snake(doc_data, refs_out)

    async def get_by_uid(self, uid: str) -> list[dict]:
        """ユーザーのメモ一覧を取得（refs含む）"""
        query = (
            self._get_db()
            .collection(self.COLLECTION)
            .where("ownerUid", "==", uid)
        )

        results = []
        async for doc in query.stream():
            data = doc.to_dict()
            # refsサブコレクションも取得
            refs = []
            doc_ref = self._get_db().collection(self.COLLECTION).document(doc.id)
            async for r in doc_ref.collection(self.SUB_COLLECTION_REFS).stream():
                rd = r.to_dict()
                refs.append(MemoRef(
                    ref_type=rd.get("refType"),
                    ref_id=rd.get("refId"),
                    note=rd.get("note"),
                ))
            results.append(self._to_snake(data, refs))
        # Python側でupdatedAtの降順ソート（複合インデックス不要）
        results.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
        return results

    async def get_by_id(self, memo_id: str, uid: str) -> dict | None:
        """メモ詳細取得"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(memo_id)
        doc = await doc_ref.get()

        if not doc.exists or doc.to_dict().get("ownerUid") != uid:
            return None

        data = doc.to_dict()

        # Refs取得
        refs = []
        async for r in doc_ref.collection(self.SUB_COLLECTION_REFS).stream():
            rd = r.to_dict()
            refs.append(MemoRef(
                ref_type=rd.get("refType"),
                ref_id=rd.get("refId"),
                note=rd.get("note"),
            ))

        return self._to_snake(data, refs)

    async def update(self, memo_id: str, uid: str, data: MemoUpdate) -> dict | None:
        """メモ更新"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(memo_id)
        doc = await doc_ref.get()

        if not doc.exists or doc.to_dict().get("ownerUid") != uid:
            return None

        now = datetime.now(timezone.utc)
        update_data: dict = {"updatedAt": now}

        if data.title is not None:
            update_data["title"] = data.title
        if data.body is not None:
            update_data["body"] = data.body
        if data.status is not None:
            update_data["status"] = data.status
        if data.tags is not None:
            update_data["tags"] = data.tags

        await doc_ref.update(update_data)

        # refs更新: 指定されていれば既存を全削除してから再作成
        refs_out: list[MemoRef] = []
        if data.refs is not None:
            # 既存refs削除
            async for r in doc_ref.collection(self.SUB_COLLECTION_REFS).stream():
                await r.reference.delete()
            # 新refs保存
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
                        "note": ref.note,
                    })
                    refs_out.append(ref)
                await batch.commit()

        updated_doc = await doc_ref.get()
        return self._to_snake(updated_doc.to_dict(), refs_out)

    async def delete(self, memo_id: str, uid: str) -> bool:
        """メモ削除"""
        doc_ref = self._get_db().collection(self.COLLECTION).document(memo_id)
        doc = await doc_ref.get()

        if not doc.exists or doc.to_dict().get("ownerUid") != uid:
            return False

        # サブコレクション(refs)を先に削除
        async for r in doc_ref.collection(self.SUB_COLLECTION_REFS).stream():
            await r.reference.delete()

        await doc_ref.delete()
        return True

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
            "refs": refs,
        }
