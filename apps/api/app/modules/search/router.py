"""
D-04: 論文検索 - ルーター
"""
from fastapi import APIRouter, Depends, Query

from app.core.firebase_auth import get_current_user
from app.modules.search.schemas import (
    ReclusterSearchRequest,
    ReclusterSearchResponse,
    SearchResultListResponse,
)
from app.modules.search.service import search_service

router = APIRouter()

@router.get("/papers", response_model=SearchResultListResponse)
async def search_papers(
    q: str = Query(..., min_length=1, description="検索キーワード"),
    source: str = Query("auto", description="検索ソース (auto, all, arxiv, pubmed, scholar, gemini)"),
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    """
    外部論文DBを検索する。
    """
    return await search_service.search_papers(query=q, limit=limit, offset=offset, source=source, uid=current_user["uid"])


@router.post("/papers/recluster", response_model=ReclusterSearchResponse)
async def search_papers_recluster(
    payload: ReclusterSearchRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    検索結果をLLMで再整理して返す。
    """
    return await search_service.search_papers_reclustered(
        query=payload.query,
        source=payload.source,
        top_k=payload.top_k,
        group_target=payload.group_target,
        include_related=payload.include_related,
        uid=current_user["uid"],
    )
