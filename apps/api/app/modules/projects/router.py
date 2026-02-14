"""D-02: プロジェクト（My Paper プロジェクト）- ルーター"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response

from app.core.firebase_auth import get_current_user
from app.modules.projects.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectPaperAdd,
    ProjectResponse,
    ProjectListResponse,
    ProjectPaperResponse,
    TexFileResponse,
    TexFileContentResponse,
    TexFileSaveRequest,
    TexCompileRequest,
    TexCompileResponse,
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


@router.get("/projects/{project_id}/tex/files", response_model=list[TexFileResponse])
async def list_project_tex_files(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """TeXワークスペースのファイル一覧"""
    return await project_service.list_tex_files(project_id, current_user["uid"])


@router.get("/projects/{project_id}/tex/file", response_model=TexFileContentResponse)
async def get_project_tex_file(
    project_id: str,
    path: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
):
    """TeXテキストファイル内容取得"""
    return await project_service.get_tex_file_content(
        project_id, current_user["uid"], path
    )


@router.post("/projects/{project_id}/tex/file", status_code=204)
async def save_project_tex_file(
    project_id: str,
    body: TexFileSaveRequest,
    current_user: dict = Depends(get_current_user),
):
    """TeXテキストファイル保存"""
    await project_service.save_tex_file_content(
        project_id, current_user["uid"], body.path, body.content
    )


@router.delete("/projects/{project_id}/tex/file", status_code=204)
async def delete_project_tex_file(
    project_id: str,
    path: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
):
    """TeXワークスペースのファイル削除"""
    await project_service.delete_tex_file(project_id, current_user["uid"], path)


@router.post("/projects/{project_id}/tex/upload", status_code=204)
async def upload_project_tex_file(
    project_id: str,
    file: UploadFile = File(...),
    path: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """TeXワークスペースにファイルアップロード"""
    target_path = path or file.filename
    if not target_path:
        raise HTTPException(status_code=400, detail="file path is required")
    content = await file.read()
    await project_service.upload_tex_file(
        project_id=project_id,
        owner_uid=current_user["uid"],
        path=target_path,
        content=content,
        content_type=file.content_type,
    )


@router.post("/projects/{project_id}/tex/compile", response_model=TexCompileResponse)
async def compile_project_tex(
    project_id: str,
    body: TexCompileRequest,
    current_user: dict = Depends(get_current_user),
):
    """TeXコンパイルしてPDFプレビューURLを返す"""
    return await project_service.compile_tex(
        project_id, current_user["uid"], body.main_file
    )


@router.get("/projects/{project_id}/tex/preview", response_model=TexCompileResponse)
async def get_project_tex_preview(
    project_id: str,
    main_file: str = Query("main.tex"),
    current_user: dict = Depends(get_current_user),
):
    """最新PDFプレビューURLを返す（未生成時はpdf_url=null）"""
    preview = await project_service.get_tex_preview_url(
        project_id, current_user["uid"], main_file
    )
    return {
        "pdf_path": preview["pdf_path"],
        "pdf_url": preview.get("pdf_url"),
        "log": None,
    }


@router.get("/projects/{project_id}/tex/preview/pdf")
async def get_project_tex_preview_pdf(
    project_id: str,
    main_file: str = Query("main.tex"),
    current_user: dict = Depends(get_current_user),
):
    """最新PDFプレビュー本体を返す（Authorization必須）"""
    content = await project_service.get_tex_preview_pdf(
        project_id, current_user["uid"], main_file
    )
    return Response(content=content, media_type="application/pdf")
