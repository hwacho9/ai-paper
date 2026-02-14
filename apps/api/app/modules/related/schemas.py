from pydantic import BaseModel, Field
from typing import Any, List, Optional

class RelatedPaper(BaseModel):
    paper_id: str = Field(..., alias="paperId")
    title: str
    authors: List[str]
    year: Optional[int] = None
    venue: Optional[str] = None
    abstract: Optional[str] = None
    similarity: float
    citation_count: int = Field(0, alias="citationCount")

class Node(BaseModel):
    id: str
    label: str
    group: Optional[str] = None # e.g. based on keywords or year
    val: int = 1 # visual size

class Edge(BaseModel):
    source: str
    target: str
    value: float # similarity score

class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class RelatedPaperResponse(BaseModel):
    papers: List[RelatedPaper]


class KeywordRelatedItem(BaseModel):
    paper_id: str
    title: str
    authors: List[str]
    year: Optional[int] = None
    reason: Optional[str] = None
    score: float = 0.0


class KeywordRelatedGroup(BaseModel):
    keyword: str
    items: List[KeywordRelatedItem]


class LibraryRelatedByKeywordResponse(BaseModel):
    paper_id: str
    groups: List[KeywordRelatedGroup]
    meta: dict[str, Any] = Field(default_factory=dict)
