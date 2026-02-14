"""D-09: 読解サポート - スキーマ"""
from pydantic import BaseModel, Field


class ExplainRequest(BaseModel):
    selected_text: str | None = None
    chunk_id: str | None = None


class ExplainResponse(BaseModel):
    explanation: str
    source_chunk_id: str
    page_range: list[int] = Field(default_factory=list)
    confidence: float = 0.0


class PaperOutlineItem(BaseModel):
    start_page: int
    end_page: int
    chunk_count: int
    first_chunk_id: str | None = None
    last_chunk_id: str | None = None


class PaperChunk(BaseModel):
    chunk_id: str
    paper_id: str
    text: str
    page_range: list[int] = Field(default_factory=list)
    start_char_idx: int | None = None
    end_char_idx: int | None = None


class HighlightCreate(BaseModel):
    chunk_id: str | None = None
    text_span: str
    start_offset: int
    end_offset: int
    page_number: int = Field(..., ge=1)
    note: str = ""
    color: str = "yellow"


class HighlightItem(BaseModel):
    id: str
    owner_uid: str
    paper_id: str
    chunk_id: str | None
    text_span: str
    start_offset: int
    end_offset: int
    page_number: int
    note: str
    color: str
    created_at: str | None = None


class LibraryAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    paper_ids: list[str] = Field(default_factory=list)
    top_k: int = Field(default=5, ge=1, le=20)


class LibraryAskCitation(BaseModel):
    paper_id: str
    chunk_id: str
    score: float
    page_range: list[int] = Field(default_factory=list)
    snippet: str


class LibraryAskResponse(BaseModel):
    answer: str
    confidence: float = 0.0
    citations: list[LibraryAskCitation] = Field(default_factory=list)
