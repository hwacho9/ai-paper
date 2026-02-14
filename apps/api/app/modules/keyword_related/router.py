from fastapi import APIRouter, Depends, Query

from app.core.firebase_auth import get_current_user
from app.modules.keyword_related.schemas import LibraryRelatedByKeywordResponse
from app.modules.keyword_related.service import keyword_related_service

router = APIRouter()


@router.get(
    "/papers/{paper_id}/library-related-by-keywords",
    response_model=LibraryRelatedByKeywordResponse,
)
async def get_library_related_by_keywords(
    paper_id: str,
    per_keyword_limit: int = Query(15, ge=1, le=20),
    max_keywords: int = Query(8, ge=1, le=20),
    current_user: dict = Depends(get_current_user),
):
    return await keyword_related_service.get_library_related_by_keywords(
        paper_id=paper_id,
        uid=current_user["uid"],
        per_keyword_limit=per_keyword_limit,
        max_keywords=max_keywords,
    )
