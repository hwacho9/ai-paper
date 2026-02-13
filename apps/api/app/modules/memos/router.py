"""
D-08: メモ & ノート - ルーター
"""
from fastapi import APIRouter, Depends, HTTPException

from app.core.firebase_auth import get_current_user
from app.modules.memos.schemas import MemoListResponse
from app.modules.memos.service import memo_service

router = APIRouter()

@router.get("", response_model=MemoListResponse)
async def get_memos(
    current_user: dict = Depends(get_current_user),
):
    """
    マイメモ一覧を取得。
    """
    return await memo_service.get_my_memos(current_user["uid"])
