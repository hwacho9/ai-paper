"""
D-04: 論文検索 - スキーマ
"""
from typing import Any, Literal

from pydantic import BaseModel, Field

class SearchQuery(BaseModel):
    q: str = Field(..., description="検索キーワード")
    year_from: int | None = None
    year_to: int | None = None
    limit: int = 20
    offset: int = 0

class SearchResultItem(BaseModel):
    external_id: str
    source: str = "semantic_scholar"
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


class ReclusterSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="検索キーワード")
    source: Literal["auto", "all", "arxiv", "pubmed", "scholar", "gemini"] = (
        "auto"
    )
    top_k: int = Field(default=60, ge=1, le=100)
    group_target: int = Field(default=4, ge=1, le=10)
    include_related: bool = True


class ClusterPaperItem(BaseModel):
    paper_id: str
    title: str
    year: int | None = None
    source: str
    score: float = 0.0
    relation_type: str | None = None
    relation_note: str | None = None


class SearchCluster(BaseModel):
    cluster_id: str
    label: str
    summary: str
    hub_paper: ClusterPaperItem
    children: list[ClusterPaperItem] = Field(default_factory=list)
    related: list[ClusterPaperItem] = Field(default_factory=list)


class ReclusterSearchResponse(BaseModel):
    query: str
    clusters: list[SearchCluster] = Field(default_factory=list)
    uncertain_items: list[ClusterPaperItem] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
