"""D-10: TeX & BibTeX - スキーマ"""
from datetime import datetime
from pydantic import BaseModel


class TexDocCreate(BaseModel):
    project_id: str
    title: str
    body: str = ""


class TexDocResponse(BaseModel):
    id: str
    owner_uid: str
    project_id: str
    title: str
    body: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CitationCreate(BaseModel):
    paper_id: str
    cite_key: str | None = None
    note: str | None = None


class CitationResponse(BaseModel):
    id: str
    paper_id: str
    cite_key: str
    note: str | None = None
    added_at: datetime | None = None
