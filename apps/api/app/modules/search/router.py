"""
D-04: 論文検索 - ルーター
"""
from fastapi import APIRouter, Depends, Query

from app.core.firebase_auth import get_current_user
from app.modules.search.schemas import SearchResultListResponse
from app.modules.search.service import search_service

router = APIRouter()

@router.get("/papers", response_model=SearchResultListResponse)
async def search_papers(
    q: str = Query(..., min_length=1, description="検索キーワード"),
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    """
    外部論文DB（Semantic Scholar）を検索する。
    """
    return await search_service.search_papers(query=q, limit=limit, offset=offset)
