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
    source: str = Query("arxiv", description="検索ソース (arxiv, pubmed, scholar, gemini)"),
    year_from: int | None = Query(None, description="開始年"),
    year_to: int | None = Query(None, description="終了年"),
    author: str | None = Query(None, description="著者名（部分一致）"),
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    """
    外部論文DBを検索する。
    """
    return await search_service.search_papers(
        query=q,
        uid=current_user["uid"],
        source=source,
        year_from=year_from,
        year_to=year_to,
        author=author,
        limit=limit,
        offset=offset,
    )
