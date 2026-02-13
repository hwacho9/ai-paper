"""D-03: ペーパーライブラリ - スキーマ"""

from datetime import datetime
from pydantic import BaseModel


class PaperCreate(BaseModel):
    """論文作成リクエスト"""
    title: str
    authors: list[str] = []
    year: int | None = None
    venue: str = ""
    doi: str | None = None
    arxiv_id: str | None = None
    abstract: str = ""


class PaperResponse(BaseModel):
    """論文レスポンス"""
    id: str
    owner_uid: str
    title: str
    authors: list[str] = []
    year: int | None = None
    venue: str = ""
    doi: str | None = None
    arxiv_id: str | None = None
    abstract: str = ""
    pdf_url: str | None = None
    status: str = "PENDING"
    is_liked: bool = False
    created_at: datetime | None = None
