"""
D-10: TeX & BibTeX - ルーター

TODO(F-1001): TeX文書CRUD | AC: 作成/保存/更新が動作 | owner:@
TODO(F-1002): 引用追加 | AC: cite key自動生成+紐付け | owner:@
TODO(F-1003): BibTeX export | AC: プロジェクト参照論文からBibTeX生成 | owner:@
"""

from fastapi import APIRouter, Depends, Query
from app.core.firebase_auth import get_current_user
from app.modules.tex.schemas import TexDocCreate, TexDocResponse, CitationCreate

router = APIRouter()


@router.post("/texdocs", response_model=TexDocResponse)
async def create_texdoc(body: TexDocCreate, current_user: dict = Depends(get_current_user)):
    # TODO(F-1001): Firestoreにドキュメント作成
    pass


@router.get("/texdocs")
async def list_texdocs(project_id: str | None = Query(None), current_user: dict = Depends(get_current_user)):
    return []


@router.get("/texdocs/{texdoc_id}", response_model=TexDocResponse)
async def get_texdoc(texdoc_id: str, current_user: dict = Depends(get_current_user)):
    pass


@router.patch("/texdocs/{texdoc_id}", response_model=TexDocResponse)
async def update_texdoc(texdoc_id: str, current_user: dict = Depends(get_current_user)):
    pass


@router.post("/texdocs/{texdoc_id}/citations")
async def add_citation(texdoc_id: str, body: CitationCreate, current_user: dict = Depends(get_current_user)):
    # TODO(F-1002): cite key生成 + 引用追加
    pass
