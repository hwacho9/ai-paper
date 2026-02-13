"""
D-09: 読解サポート - ルーター

TODO(F-0901): PDFレンダリング | AC: ページ移動、ロード状態表示 | owner:@
TODO(F-0903): 文章解釈 | AC: 選択テキスト→LLM解釈+根拠返却 | owner:@
"""

from fastapi import APIRouter, Depends
from app.core.firebase_auth import get_current_user
from app.modules.reading.schemas import ExplainRequest, ExplainResponse

router = APIRouter()


@router.get("/papers/{paper_id}/outline")
async def get_outline(paper_id: str, current_user: dict = Depends(get_current_user)):
    """PDF目次/セクション構造"""
    # TODO(F-0902): チャンクからセクション構造を構築
    return []


@router.get("/papers/{paper_id}/chunks")
async def get_chunks(paper_id: str, section: str | None = None, current_user: dict = Depends(get_current_user)):
    """チャンク一覧"""
    return []


@router.post("/papers/{paper_id}/explain", response_model=ExplainResponse)
async def explain_text(paper_id: str, body: ExplainRequest, current_user: dict = Depends(get_current_user)):
    """選択テキスト解釈（LLM）— 根拠必須"""
    # TODO(F-0903): Vertex AI Gemini呼び出し + sourceChunkId/pageRange返却
    pass


@router.post("/papers/{paper_id}/highlights")
async def create_highlight(paper_id: str, current_user: dict = Depends(get_current_user)):
    """ハイライト保存"""
    # TODO(F-0903): Firestoreにハイライト保存
    pass


@router.get("/papers/{paper_id}/highlights")
async def list_highlights(paper_id: str, current_user: dict = Depends(get_current_user)):
    """ハイライト一覧"""
    return []
