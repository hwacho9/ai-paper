"""
D-02: プロジェクト - スキーマ
"""

from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    """プロジェクト作成リクエスト"""
    title: str
    description: str = ""
    seed_paper_ids: list[str] = []


class ProjectUpdate(BaseModel):
    """プロジェクト更新リクエスト"""
    title: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    """プロジェクトレスポンス"""
    id: str
    owner_uid: str
    title: str
    description: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    paper_count: int = 0
    status: str = "active"


class ProjectListResponse(BaseModel):
    """プロジェクト一覧レスポンス"""
    projects: list[ProjectResponse]
    total: int


class ProjectPaperAdd(BaseModel):
    """プロジェクトへの論文追加"""
    paper_id: str
    note: str | None = None
    role: str = "reference"


class ProjectPaperResponse(BaseModel):
    """プロジェクト論文レスポンス"""
    paper_id: str
    note: str = ""
    role: str = "reference"
    added_at: datetime | None = None


class TexFileResponse(BaseModel):
    """TeXワークスペース内ファイル情報"""
    path: str
    size: int | None = None
    content_type: str | None = None
    updated_at: datetime | None = None


class TexFileContentResponse(BaseModel):
    """テキストファイル内容"""
    path: str
    content: str


class TexFileSaveRequest(BaseModel):
    """テキストファイル保存"""
    path: str
    content: str


class TexCompileRequest(BaseModel):
    """TeXコンパイルリクエスト"""
    main_file: str = "main.tex"


class TexCompileResponse(BaseModel):
    """TeXコンパイル結果"""
    pdf_path: str
    pdf_url: str | None = None
    log: str | None = None
