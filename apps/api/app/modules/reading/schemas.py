"""D-09: 読解サポート - スキーマ"""
from pydantic import BaseModel


class ExplainRequest(BaseModel):
    selected_text: str | None = None
    chunk_id: str | None = None


class ExplainResponse(BaseModel):
    explanation: str
    source_chunk_id: str
    page_range: list[int] = []
    confidence: float = 0.0
