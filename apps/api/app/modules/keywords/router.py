"""
D-06: キーワード & タグ付け - ルーター

TODO(F-0601): キーワードCRUD | AC: 作成/読取/更新/削除が動作 | owner:@
TODO(F-0602): 論文タグ付け | AC: 論文とキーワードの紐付け/解除 | owner:@
TODO(F-0603): 自動推薦 | AC: LLM/埋め込みベースのキーワード候補返却 | owner:@
"""

from fastapi import APIRouter, Depends
from app.core.firebase_auth import get_current_user
from app.modules.keywords.schemas import KeywordCreate, KeywordResponse

router = APIRouter()


@router.post("/keywords", response_model=KeywordResponse)
async def create_keyword(body: KeywordCreate, current_user: dict = Depends(get_current_user)):
    # TODO(F-0601): Firestoreにキーワード作成
    pass


@router.get("/keywords")
async def list_keywords(current_user: dict = Depends(get_current_user)):
    return []


@router.patch("/keywords/{keyword_id}")
async def update_keyword(keyword_id: str, current_user: dict = Depends(get_current_user)):
    pass


@router.delete("/keywords/{keyword_id}")
async def delete_keyword(keyword_id: str, current_user: dict = Depends(get_current_user)):
    pass


@router.post("/papers/{paper_id}/keywords")
async def tag_paper(paper_id: str, current_user: dict = Depends(get_current_user)):
    # TODO(F-0602): 論文にキーワードタグ付け
    pass


@router.delete("/papers/{paper_id}/keywords/{keyword_id}")
async def untag_paper(paper_id: str, keyword_id: str, current_user: dict = Depends(get_current_user)):
    pass


@router.post("/papers/{paper_id}/keywords/suggest")
async def suggest_keywords(paper_id: str, current_user: dict = Depends(get_current_user)):
    """自動キーワード推薦"""
    # TODO(F-0603): LLM/埋め込みベースの推薦
    return []
