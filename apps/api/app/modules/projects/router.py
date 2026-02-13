"""
D-02: プロジェクト（My Paper プロジェクト）- ルーター

TODO(F-0201): プロジェクトCRUD | AC: 作成/読取/更新/削除が動作 | owner:@
TODO(F-0202): 参照論文追加/削除 | AC: プロジェクトと論文の紐付け/解除 | owner:@
TODO(F-0205): Seed Papers生成 | AC: seedPaperIds[]で初期参照論文付き作成 | owner:@
TODO(F-0204): BibTeX export | AC: プロジェクト参照論文からBibTeX生成 | owner:@
"""

from fastapi import APIRouter, Depends

from app.core.firebase_auth import get_current_user
from app.modules.projects.schemas import (
    ProjectCreate,
    ProjectPaperAdd,
    ProjectResponse,
)

router = APIRouter()


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    body: ProjectCreate,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクト作成（seedPaperIds対応）"""
    # TODO(F-0201): Firestoreにプロジェクト作成
    # TODO(F-0205): seedPaperIdsがある場合、参照論文も追加
    pass


@router.get("/projects")
async def list_projects(current_user: dict = Depends(get_current_user)):
    """プロジェクト一覧"""
    # TODO(F-0201): ownerUidでフィルターして一覧返却
    return []


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクト詳細"""
    # TODO(F-0201): Firestoreからプロジェクト取得
    pass


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクト更新"""
    # TODO(F-0201): Firestoreのプロジェクト更新
    pass


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクト削除"""
    # TODO(F-0201): Firestoreのプロジェクト削除
    pass


@router.post("/projects/{project_id}/papers")
async def add_paper_to_project(
    project_id: str,
    body: ProjectPaperAdd,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクトに参照論文追加"""
    # TODO(F-0202): Firestoreにプロジェクト-論文紐付け追加
    pass


@router.delete("/projects/{project_id}/papers/{paper_id}")
async def remove_paper_from_project(
    project_id: str,
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """プロジェクトから参照論文削除"""
    # TODO(F-0202): Firestoreのプロジェクト-論文紐付け削除
    pass


@router.get("/projects/{project_id}/export/bibtex")
async def export_bibtex(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """BibTeX export"""
    # TODO(F-0204): プロジェクト参照論文からBibTeX生成
    return {"bibtex": "", "entry_count": 0}
