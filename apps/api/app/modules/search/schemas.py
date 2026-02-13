"""D-04: 論文検索 - スキーマ"""

from pydantic import BaseModel


class SearchResultItem(BaseModel):
    """検索結果 1件"""
    external_id: str
    source: str
    title: str
    authors: list[str] = []
    year: int | None = None
    venue: str = ""
    abstract: str = ""
    doi: str | None = None
    arxiv_id: str | None = None
    pdf_url: str | None = None
    citation_count: int | None = None
    is_in_library: bool = False


class SearchResultListResponse(BaseModel):
    """検索結果リスト"""
    results: list[SearchResultItem]
    total: int
    offset: int
    limit: int
