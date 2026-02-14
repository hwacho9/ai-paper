"""
D-09: 読解サポート - ルーター

TODO(F-0901): PDFレンダリング | AC: ページ移動、ロード状態表示 | owner:@
TODO(F-0903): 文章解釈 | AC: 選択テキスト→LLM解釈+根拠返却 | owner:@
"""

from fastapi import APIRouter, Depends
from app.core.firebase_auth import get_current_user
from app.modules.reading.schemas import (
    ExplainRequest,
    ExplainResponse,
    LibraryAskRequest,
    LibraryAskResponse,
    PaperChunk,
    PaperOutlineItem,
    HighlightCreate,
    HighlightItem,
)
from app.modules.reading.service import reading_service

router = APIRouter()


@router.get("/papers/{paper_id}/outline", response_model=list[PaperOutlineItem])
async def get_outline(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """PDF目次/セクション構造"""
    return await reading_service.get_outline(paper_id, current_user["uid"])


@router.get("/papers/{paper_id}/chunks", response_model=list[PaperChunk])
async def get_chunks(
    paper_id: str,
    section: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    """チャンク一覧"""
    return await reading_service.get_chunks(paper_id, current_user["uid"], section)


@router.post("/papers/{paper_id}/explain", response_model=ExplainResponse)
async def explain_text(
    paper_id: str,
    body: ExplainRequest,
    current_user: dict = Depends(get_current_user),
):
    """選択テキスト解釈（LLM）— 根拠必須"""
    return await reading_service.explain(paper_id, current_user["uid"], body)


@router.post("/papers/{paper_id}/highlights", response_model=HighlightItem)
async def create_highlight(
    paper_id: str,
    body: HighlightCreate,
    current_user: dict = Depends(get_current_user),
):
    """ハイライト保存"""
    return await reading_service.create_highlight(
        paper_id,
        current_user["uid"],
        body,
    )


@router.get("/papers/{paper_id}/highlights", response_model=list[HighlightItem])
async def list_highlights(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """ハイライト一覧"""
    return await reading_service.list_highlights(paper_id, current_user["uid"])


@router.post("/library/ask", response_model=LibraryAskResponse)
async def ask_library(
    body: LibraryAskRequest,
    current_user: dict = Depends(get_current_user),
):
    """ライブラリ内論文を対象にしたRAG Q&A"""
    return await reading_service.ask_library(current_user["uid"], body)
