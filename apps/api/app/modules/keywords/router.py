"""
D-06: キーワード & タグ付け - ルーター
"""

from fastapi import APIRouter, Depends, Response, status

from app.core.firebase_auth import get_current_user
from app.modules.keywords.schemas import (
    KeywordSuggestionResponse,
    PaperKeywordListResponse,
    PaperKeywordResponse,
    PaperKeywordTagCreate,
    KeywordCreate,
    KeywordListResponse,
    KeywordResponse,
    KeywordUpdate,
)
from app.modules.keywords.service import keyword_service

router = APIRouter()


@router.post("/keywords", response_model=KeywordResponse, status_code=status.HTTP_201_CREATED)
async def create_keyword(
    body: KeywordCreate,
    current_user: dict = Depends(get_current_user),
):
    """キーワード作成"""
    return await keyword_service.create_keyword(current_user["uid"], body)


@router.get("/keywords", response_model=KeywordListResponse)
async def list_keywords(current_user: dict = Depends(get_current_user)):
    """キーワード一覧"""
    return await keyword_service.list_keywords(current_user["uid"])


@router.patch("/keywords/{keyword_id}", response_model=KeywordResponse)
async def update_keyword(
    keyword_id: str,
    body: KeywordUpdate,
    current_user: dict = Depends(get_current_user),
):
    """キーワード更新"""
    return await keyword_service.update_keyword(keyword_id, current_user["uid"], body)


@router.delete("/keywords/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_keyword(
    keyword_id: str,
    current_user: dict = Depends(get_current_user),
):
    """キーワード削除"""
    await keyword_service.delete_keyword(keyword_id, current_user["uid"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/papers/{paper_id}/keywords")
async def tag_paper(
    paper_id: str,
    body: PaperKeywordTagCreate,
    current_user: dict = Depends(get_current_user),
) -> PaperKeywordResponse:
    """論文にキーワードタグ付け"""
    return await keyword_service.tag_paper(paper_id, current_user["uid"], body)


@router.get("/papers/{paper_id}/keywords", response_model=PaperKeywordListResponse)
async def list_paper_keywords(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """論文のキーワード一覧"""
    return await keyword_service.list_paper_keywords(paper_id, current_user["uid"])


@router.delete("/papers/{paper_id}/keywords/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
async def untag_paper(
    paper_id: str,
    keyword_id: str,
    current_user: dict = Depends(get_current_user),
):
    """論文からキーワード解除"""
    await keyword_service.untag_paper(paper_id, keyword_id, current_user["uid"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/papers/{paper_id}/keywords/suggest", response_model=KeywordSuggestionResponse)
async def suggest_keywords(paper_id: str, current_user: dict = Depends(get_current_user)):
    """自動キーワード推薦"""
    return await keyword_service.suggest_and_apply(paper_id, current_user["uid"])
