"""
D-08: メモ & ノート - ルーター

TODO(F-0801): メモCRUD | AC: 作成/読取/更新/削除が動作 | owner:@
TODO(F-0802): 参照連結 | AC: メモとPaper/Chunk/Keywordの紐付け | owner:@
TODO(F-0803): メモ検索 | AC: キーワード/論文ベースのフィルタリング | owner:@
"""

from fastapi import APIRouter, Depends

from app.core.firebase_auth import get_current_user
from app.modules.memos.schemas import MemoCreate, MemoResponse

router = APIRouter()


@router.post("/memos", response_model=MemoResponse)
async def create_memo(body: MemoCreate, current_user: dict = Depends(get_current_user)):
    """メモ作成"""
    # TODO(F-0801): Firestoreにメモ作成 + 参照連結
    pass


@router.get("/memos")
async def list_memos(current_user: dict = Depends(get_current_user)):
    """メモ一覧"""
    # TODO(F-0801): ownerUidでフィルター
    return []


@router.get("/memos/{memo_id}", response_model=MemoResponse)
async def get_memo(memo_id: str, current_user: dict = Depends(get_current_user)):
    """メモ詳細"""
    # TODO(F-0801): Firestoreからメモ取得
    pass


@router.patch("/memos/{memo_id}", response_model=MemoResponse)
async def update_memo(memo_id: str, current_user: dict = Depends(get_current_user)):
    """メモ更新"""
    # TODO(F-0801): Firestoreのメモ更新
    pass


@router.delete("/memos/{memo_id}")
async def delete_memo(memo_id: str, current_user: dict = Depends(get_current_user)):
    """メモ削除"""
    # TODO(F-0801): Firestoreのメモ削除
    pass
