from pydantic import BaseModel, Field
from typing import List, Optional

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
