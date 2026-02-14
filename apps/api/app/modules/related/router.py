from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from app.core.firebase_auth import get_current_user
from app.modules.related.schemas import (
    GraphData,
    LibraryRelatedByKeywordResponse,
    RelatedPaper,
    RelatedPaperResponse,
)
from app.modules.related.service import related_service

router = APIRouter()

@router.get("/papers/{paper_id}/related", response_model=List[RelatedPaper])
async def get_related_papers(
    paper_id: str,
    limit: int = 5,
    current_user: dict = Depends(get_current_user),
):
    """
    Get related papers for a given paper ID.
    """
    return await related_service.get_related_papers(paper_id, limit)


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
    """
    Get keyword-grouped related papers from user's library.
    """
    return await related_service.get_library_related_by_keywords(
        paper_id=paper_id,
        uid=current_user["uid"],
        per_keyword_limit=per_keyword_limit,
        max_keywords=max_keywords,
    )

@router.get("/graph", response_model=GraphData)
async def get_global_graph(
    current_user: dict = Depends(get_current_user),
):
    """
    Get global graph data (Projects, Papers, Related).
    """
    return await related_service.get_global_graph(current_user["uid"])

@router.get("/projects/{project_id}/graph", response_model=GraphData)
async def get_project_graph(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get graph data for a project.
    """
    return await related_service.get_project_graph(project_id)
