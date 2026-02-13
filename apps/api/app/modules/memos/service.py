"""
D-08: メモ & ノート - サービス
"""
from app.modules.memos.repository import MemoRepository
from app.modules.memos.schemas import MemoCreate, MemoResponse, MemoListResponse, MemoRef

class MemoService:
    def __init__(self):
        self.repository = MemoRepository()

    async def create_auto_memo(self, uid: str, paper_id: str, paper_title: str):
        """
        論文いいね時に自動作成されるメモ
        """
        initial_body = f"""## 概要
(Abstractや要約をここに記述)

## 貢献
- Point 1
- Point 2

## 感想・メモ
"""
        create_data = MemoCreate(
            title=f"Note: {paper_title}",
            body=initial_body,
            tags=["auto-generated"],
            status="draft",
            refs=[
                MemoRef(ref_type="paper", ref_id=paper_id)
            ]
        )
        await self.repository.create(uid, create_data)

    async def get_my_memos(self, uid: str) -> MemoListResponse:
        """マイメモ一覧取得"""
        memos_data = await self.repository.get_by_uid(uid)
        memos = [MemoResponse(**m) for m in memos_data]
        return MemoListResponse(memos=memos, total=len(memos))

memo_service = MemoService()
