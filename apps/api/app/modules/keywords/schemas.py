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


class PaperKeywordTagCreate(BaseModel):
    keyword_id: str
    confidence: float | None = None


class PaperKeywordResponse(BaseModel):
    paper_id: str
    keyword_id: str
    label: str
    description: str = ""
    confidence: float
    source: str = "manual"


class PaperKeywordListResponse(BaseModel):
    keywords: list[PaperKeywordResponse]
    total: int


class KeywordSuggestionItem(BaseModel):
    keyword_id: str
    label: str
    confidence: float
    source: str = "auto"
    reason: str = ""


class KeywordSuggestionResponse(BaseModel):
    paper_id: str
    suggestions: list[KeywordSuggestionItem]
    total: int
