"""D-06: キーワード - サービス"""

from fastapi import HTTPException

from app.modules.keywords.repository import KeywordRepository
from app.modules.keywords.schemas import (
    KeywordCreate,
    KeywordListResponse,
    KeywordResponse,
    KeywordUpdate,
)


class KeywordService:
    def __init__(self):
        self.repository = KeywordRepository()

    async def create_keyword(self, owner_uid: str, data: KeywordCreate) -> KeywordResponse:
        """キーワード作成（同一ユーザー内label重複禁止）"""
        label = data.label.strip()
        if not label:
            raise HTTPException(status_code=400, detail="label must not be empty")

        existing = await self.repository.get_by_label(owner_uid, label)
        if existing:
            raise HTTPException(status_code=409, detail="keyword label already exists")

        created = await self.repository.create(
            owner_uid=owner_uid,
            data={"label": label, "description": data.description},
        )
        return KeywordResponse(**created)

    async def list_keywords(self, owner_uid: str) -> KeywordListResponse:
        """キーワード一覧取得"""
        items = await self.repository.list_by_owner(owner_uid)
        keywords = [KeywordResponse(**item) for item in items]
        return KeywordListResponse(keywords=keywords, total=len(keywords))

    async def update_keyword(
        self,
        keyword_id: str,
        owner_uid: str,
        data: KeywordUpdate,
    ) -> KeywordResponse:
        """キーワード更新（label変更時は重複チェック）"""
        if data.label is not None:
            label = data.label.strip()
            if not label:
                raise HTTPException(status_code=400, detail="label must not be empty")

            existing = await self.repository.get_by_label(owner_uid, label)
            if existing and existing["id"] != keyword_id:
                raise HTTPException(status_code=409, detail="keyword label already exists")

        updated = await self.repository.update(
            keyword_id=keyword_id,
            owner_uid=owner_uid,
            data=data.model_dump(exclude_unset=True),
        )
        if not updated:
            raise HTTPException(status_code=404, detail="keyword not found")
        return KeywordResponse(**updated)

    async def delete_keyword(self, keyword_id: str, owner_uid: str) -> None:
        """キーワード削除"""
        success = await self.repository.delete(keyword_id=keyword_id, owner_uid=owner_uid)
        if not success:
            raise HTTPException(status_code=404, detail="keyword not found")

    async def suggest(self, paper_id: str) -> list[dict]:
        # TODO(F-0603): LLM/埋め込みベースのキーワード推薦
        return []


keyword_service = KeywordService()
