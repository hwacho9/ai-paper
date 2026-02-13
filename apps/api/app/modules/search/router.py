"""
D-04: 論文検索 - ルーター

TODO(F-0401): キーワード検索 | AC: 外部API呼び出し+結果正規化 | owner:@
TODO(F-0402): フィルター | AC: 年度/著者/ソースによるフィルタリング | owner:@
"""

from fastapi import APIRouter, Depends, Query

from app.core.firebase_auth import get_current_user
from app.modules.search.schemas import SearchResultListResponse

router = APIRouter()


@router.get("/search/papers", response_model=SearchResultListResponse)
async def search_papers(
    q: str = Query(..., description="検索キーワード"),
    year_from: int | None = Query(None, description="開始年"),
    year_to: int | None = Query(None, description="終了年"),
    author: str | None = Query(None, description="著者名"),
    source: str = Query("semantic_scholar", description="検索ソース"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """外部論文検索"""
    # TODO(F-0401): 外部API（Semantic Scholar）呼び出し + 結果正規化
    # TODO(F-0402): フィルター適用
    return SearchResultListResponse(results=[], total=0, offset=offset, limit=limit)
