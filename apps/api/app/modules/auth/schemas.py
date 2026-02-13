"""
D-01: 認証 & ユーザー - スキーマ（Pydantic DTO）
"""

from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    """ユーザー情報レスポンス"""
    uid: str
    email: str
    display_name: str = ""
    research_fields: list[str] = []
    created_at: datetime | None = None
    preferences: dict = {}


class UserUpdate(BaseModel):
    """ユーザー情報更新リクエスト"""
    display_name: str | None = None
    research_fields: list[str] | None = None
    preferences: dict | None = None
