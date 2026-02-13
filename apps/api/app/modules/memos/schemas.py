"""D-08: メモ & ノート - スキーマ"""

from datetime import datetime
from pydantic import BaseModel


class MemoRefCreate(BaseModel):
    """メモ参照作成"""
    ref_type: str  # "paper" | "project" | "chunk" | "keyword"
    ref_id: str
    note: str | None = None


class MemoCreate(BaseModel):
    """メモ作成リクエスト"""
    title: str = ""
    body: str = ""
    tags: list[str] = []
    refs: list[MemoRefCreate] = []


class MemoRefResponse(BaseModel):
    """メモ参照レスポンス"""
    ref_type: str
    ref_id: str
    note: str | None = None


class MemoResponse(BaseModel):
    """メモレスポンス"""
    id: str
    owner_uid: str
    title: str
    body: str
    status: str = "draft"
    tags: list[str] = []
    refs: list[MemoRefResponse] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None
