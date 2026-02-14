"""D-06: キーワード - スキーマ"""
from datetime import datetime
from pydantic import BaseModel


class KeywordCreate(BaseModel):
    label: str
    description: str = ""


class KeywordUpdate(BaseModel):
    label: str | None = None
    description: str | None = None


class KeywordResponse(BaseModel):
    id: str
    owner_uid: str
    label: str
    description: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None


class KeywordListResponse(BaseModel):
    keywords: list[KeywordResponse]
    total: int
