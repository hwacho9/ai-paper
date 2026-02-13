"""
D-08: メモ & ノート - スキーマ
"""
from datetime import datetime
from pydantic import BaseModel, Field

class MemoRef(BaseModel):
    ref_type: str = Field(..., description="paper | project | chunk | keyword")
    ref_id: str
    note: str | None = None

class MemoCreate(BaseModel):
    title: str = ""
    body: str = ""
    tags: list[str] = []
    refs: list[MemoRef] = []
    status: str = "draft"

class MemoResponse(BaseModel):
    id: str
    owner_uid: str
    title: str
    body: str
    status: str
    created_at: datetime | None
    updated_at: datetime | None
    tags: list[str]
    refs: list[MemoRef]

class MemoListResponse(BaseModel):
    memos: list[MemoResponse]
    total: int
