"""
D-02: プロジェクト - スキーマ
"""

from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    """プロジェクト作成リクエスト"""
    title: str
    description: str = ""
    seed_paper_ids: list[str] = []


class ProjectResponse(BaseModel):
    """プロジェクトレスポンス"""
    id: str
    owner_uid: str
    title: str
    description: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    paper_count: int = 0
    status: str = "active"


class ProjectPaperAdd(BaseModel):
    """プロジェクトへの論文追加"""
    paper_id: str
    note: str | None = None
    role: str = "reference"
