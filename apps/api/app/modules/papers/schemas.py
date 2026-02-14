"""
D-03: ペーパーライブラリ - スキーマ
"""
from datetime import datetime
from pydantic import BaseModel, Field

class PaperCreate(BaseModel):
    """論文作成（検索結果からの保存）"""
    external_id: str
    source: str = "semantic_scholar"
    title: str
    authors: list[str] = []
    year: int | None = None
    venue: str = ""
    abstract: str = ""
    doi: str | None = None
    arxiv_id: str | None = None
    pdf_url: str | None = None
    keywords: list[str] = []
    prerequisite_keywords: list[str] = []

class PaperResponse(BaseModel):
    """論文詳細レスポンス"""
    id: str  # internal ID (usually same as external_id or UUID)
    owner_uid: str | None = None # Global papers might not have a single owner, but for now we follow the doc
    title: str
    authors: list[str]
    year: int | None
    venue: str
    abstract: str
    doi: str | None
    arxiv_id: str | None
    pdf_url: str | None
    status: str = "PENDING" # PENDING, INGESTING, READY, FAILED
    is_liked: bool = False
    keywords: list[str] = []
    prerequisite_keywords: list[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

class PaperListResponse(BaseModel):
    papers: list[PaperResponse]
    total: int
