from pydantic import BaseModel, Field
from typing import Any, List, Optional


class KeywordRelatedItem(BaseModel):
    paper_id: str
    title: str
    authors: List[str]
    year: Optional[int] = None
    paper_keywords: List[str] = Field(default_factory=list)
    prerequisite_keywords: List[str] = Field(default_factory=list)
    matched_tag: Optional[str] = None
    candidate_tag: Optional[str] = None
    reason: Optional[str] = None
    score: float = 0.0


class KeywordRelatedGroup(BaseModel):
    keyword: str
    items: List[KeywordRelatedItem]


class LibraryRelatedByKeywordResponse(BaseModel):
    paper_id: str
    groups: List[KeywordRelatedGroup]
    meta: dict[str, Any] = Field(default_factory=dict)
