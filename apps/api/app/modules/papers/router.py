"""
D-03: ペーパーライブラリ - ルーター
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.firebase_auth import get_current_user
from app.modules.papers.schemas import PaperCreate, PaperResponse, PaperListResponse
from app.modules.papers.service import paper_service

router = APIRouter()

@router.get("", response_model=PaperListResponse)
async def get_library(
    current_user: dict = Depends(get_current_user),
):
    """
    マイライブラリ（いいねした論文）一覧を取得。
    """
    return await paper_service.get_user_library(current_user["uid"])

@router.post("/{paper_id}/like", response_model=bool)
async def toggle_like(
    paper_id: str,
    paper_data: PaperCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    論文のいいねをトグルする（保存/解除）。
    未保存の論文は自動的にメタデータが保存される。
    
    Returns:
        bool: 現在のいいね状態 (True: 保存済み, False: 解除済み)
    """
    if paper_id != paper_data.external_id:
        raise HTTPException(status_code=400, detail="ID mismatch")
        
    return await paper_service.toggle_like(current_user["uid"], paper_data)

@router.get("/{paper_id}", response_model=PaperResponse)
async def get_paper(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    論文詳細を取得。
    """
    paper = await paper_service.get_paper(paper_id, current_user["uid"])
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper
