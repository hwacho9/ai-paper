"""D-07: 関連グラフ - スキーマ"""
from pydantic import BaseModel


class RelatedPaperResponse(BaseModel):
    paper_id: str
    title: str
    score: float
    reasons: list[dict] = []


class GraphNode(BaseModel):
    id: str
    label: str
    x: float = 0
    y: float = 0


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float = 0


class GraphDataResponse(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
