"""
D-04: 論文検索 - スキーマ
"""
from pydantic import BaseModel, Field

class SearchQuery(BaseModel):
    q: str = Field(..., description="検索キーワード")
    year_from: int | None = None
    year_to: int | None = None
    limit: int = 20
    offset: int = 0

class SearchResultItem(BaseModel):
    external_id: str
    source: str = "gemini"
    title: str
    authors: list[str]
    year: int | None
    venue: str
    abstract: str
    doi: str | None
    arxiv_id: str | None
    pdf_url: str | None
    citation_count: int | None
    is_in_library: bool = False

class SearchResultListResponse(BaseModel):
    results: list[SearchResultItem]
    total: int
    offset: int
    limit: int
