"""
D-08: メモ & ノート - ルーター
"""
from fastapi import APIRouter, Depends, HTTPException

from app.core.firebase_auth import get_current_user
from app.modules.memos.schemas import (
    MemoCreate,
    MemoUpdate,
    MemoResponse,
    MemoListResponse,
)
from app.modules.memos.service import memo_service

router = APIRouter()


@router.get("", response_model=MemoListResponse)
async def get_memos(
    current_user: dict = Depends(get_current_user),
):
    """マイメモ一覧を取得。"""
    return await memo_service.get_my_memos(current_user["uid"])


@router.post("", response_model=MemoResponse, status_code=201)
async def create_memo(
    body: MemoCreate,
    current_user: dict = Depends(get_current_user),
):
    """メモを作成。"""
    return await memo_service.create_memo(current_user["uid"], body)


@router.get("/{memo_id}", response_model=MemoResponse)
async def get_memo(
    memo_id: str,
    current_user: dict = Depends(get_current_user),
):
    """メモ詳細を取得。"""
    return await memo_service.get_memo(memo_id, current_user["uid"])


@router.patch("/{memo_id}", response_model=MemoResponse)
async def update_memo(
    memo_id: str,
    body: MemoUpdate,
    current_user: dict = Depends(get_current_user),
):
    """メモを更新。"""
    return await memo_service.update_memo(memo_id, current_user["uid"], body)


@router.delete("/{memo_id}", status_code=204)
async def delete_memo(
    memo_id: str,
    current_user: dict = Depends(get_current_user),
):
    """メモを削除。"""
    await memo_service.delete_memo(memo_id, current_user["uid"])
