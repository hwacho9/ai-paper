from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.firebase_auth import get_current_user
from app.modules.related.schemas import RelatedPaperResponse, GraphData, RelatedPaper
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


@router.get("/graph", response_model=GraphData)
async def get_global_graph(
    connection_mode: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Get global graph data (Projects, Papers, Related).
    """
    return await related_service.get_global_graph(
        current_user["uid"],
        connection_mode=connection_mode,
    )

@router.get("/projects/{project_id}/graph", response_model=GraphData)
async def get_project_graph(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get graph data for a project.
    """
    return await related_service.get_project_graph(project_id)
