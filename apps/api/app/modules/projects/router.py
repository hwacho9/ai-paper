"""
D-02: プロジェクト（My Paper プロジェクト）- ルーター
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.firebase_auth import get_current_user
from app.modules.projects.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectPaperAdd,
    ProjectResponse,
    ProjectListResponse,
    ProjectPaperResponse,
)
from app.modules.projects.service import project_service

router = APIRouter()


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: ProjectCreate,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクト作成（seedPaperIds対応）"""
    project = await project_service.create_project(
        current_user["uid"], body.model_dump()
    )
    return project


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(current_user: dict = Depends(get_current_user)):
    """プロジェクト一覧"""
    projects = await project_service.list_projects(current_user["uid"])
    return ProjectListResponse(projects=projects, total=len(projects))


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクト詳細"""
    return await project_service.get_project(project_id, current_user["uid"])


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクト更新"""
    return await project_service.update_project(
        project_id, current_user["uid"], body.model_dump(exclude_unset=True)
    )


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクト削除"""
    await project_service.delete_project(project_id, current_user["uid"])


@router.post("/projects/{project_id}/papers", response_model=ProjectPaperResponse, status_code=201)
async def add_paper_to_project(
    project_id: str,
    body: ProjectPaperAdd,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクトに参照論文追加"""
    return await project_service.add_paper(
        project_id, body.paper_id, current_user["uid"],
        note=body.note or "", role=body.role,
    )


@router.delete("/projects/{project_id}/papers/{paper_id}", status_code=204)
async def remove_paper_from_project(
    project_id: str,
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクトから参照論文削除"""
    await project_service.remove_paper(project_id, paper_id, current_user["uid"])


@router.get("/projects/{project_id}/papers", response_model=list[ProjectPaperResponse])
async def list_project_papers(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクトの参照論文一覧"""
    return await project_service.get_project_papers(project_id, current_user["uid"])
