"""
D-01: 認証 & ユーザー - ルーター

GET /me   — ログインユーザー情報取得（初回は自動作成）
PATCH /me — プロフィール更新
"""

from fastapi import APIRouter, Depends

from app.core.firebase_auth import get_current_user
from app.modules.auth.schemas import UserResponse, UserUpdate
from app.modules.auth.service import AuthService

router = APIRouter()
auth_service = AuthService()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    現在ログイン中のユーザー情報を取得する。
    Firestoreにユーザードキュメントが存在しない場合は自動作成される。
    """
    return await auth_service.get_or_create_user(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    update: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    """ユーザー情報を更新"""
    return await auth_service.update_user(current_user["uid"], update)
