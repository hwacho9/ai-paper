"""
D-08: メモ & ノート - サービス
"""
from fastapi import HTTPException

from app.modules.memos.repository import MemoRepository
from app.modules.memos.schemas import (
    MemoCreate,
    MemoUpdate,
    MemoResponse,
    MemoListResponse,
    MemoRef,
)


class MemoService:
    def __init__(self):
        self.repository = MemoRepository()

    async def create_memo(self, uid: str, data: MemoCreate) -> MemoResponse:
        """メモ作成"""
        result = await self.repository.create(uid, data)
        return MemoResponse(**result)

    async def create_auto_memo(self, uid: str, paper_id: str, paper_title: str):
        """論文いいね時に自動作成されるメモ"""
        initial_body = """## 概要
(Abstractや要約をここに記述)

## 貢献
- Point 1
- Point 2

## 感想・メモ
"""
        create_data = MemoCreate(
            title=f"Paper: {paper_title}",
            body=initial_body,
            tags=["auto-generated"],
            status="draft",
            refs=[
                MemoRef(ref_type="paper", ref_id=paper_id)
            ],
        )
        await self.repository.create(uid, create_data)

    async def get_my_memos(self, uid: str) -> MemoListResponse:
        """マイメモ一覧取得"""
        memos_data = await self.repository.get_by_uid(uid)
        memos = [MemoResponse(**m) for m in memos_data]
        return MemoListResponse(memos=memos, total=len(memos))

    async def get_memo(self, memo_id: str, uid: str) -> MemoResponse:
        """メモ詳細取得"""
        result = await self.repository.get_by_id(memo_id, uid)
        if not result:
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        return MemoResponse(**result)

    async def update_memo(self, memo_id: str, uid: str, data: MemoUpdate) -> MemoResponse:
        """メモ更新"""
        result = await self.repository.update(memo_id, uid, data)
        if not result:
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        return MemoResponse(**result)

    async def delete_memo(self, memo_id: str, uid: str) -> None:
        """メモ削除"""
        success = await self.repository.delete(memo_id, uid)
        if not success:
            raise HTTPException(status_code=404, detail="メモが見つかりません")


memo_service = MemoService()
