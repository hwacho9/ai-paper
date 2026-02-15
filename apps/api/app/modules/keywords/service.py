"""D-06: キーワード - サービス"""

import logging

from fastapi import HTTPException

from app.modules.keywords.repository import KeywordRepository
from app.modules.papers.repository import PaperRepository
from app.modules.keywords.schemas import (
    KeywordSuggestionItem,
    KeywordSuggestionResponse,
    PaperKeywordListResponse,
    PaperKeywordResponse,
    PaperKeywordTagCreate,
    KeywordCreate,
    KeywordListResponse,
    KeywordResponse,
    KeywordUpdate,
)
from app.modules.keywords.suggester import suggest_keywords_llm

logger = logging.getLogger(__name__)

class KeywordService:
    def __init__(self):
        self.repository = KeywordRepository()
        self.paper_repository = PaperRepository()

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

    async def tag_paper(
        self,
        paper_id: str,
        owner_uid: str,
        data: PaperKeywordTagCreate,
    ) -> PaperKeywordResponse:
        """論文にキーワードをタグ付け"""
        keyword = await self.repository.get_by_id(data.keyword_id, owner_uid)
        if not keyword:
            raise HTTPException(status_code=404, detail="keyword not found")

        await self._ensure_paper_access(owner_uid, paper_id)

        confidence = data.confidence if data.confidence is not None else 1.0
        if confidence < 0 or confidence > 1:
            raise HTTPException(status_code=400, detail="confidence must be between 0 and 1")

        reason = data.reason or "manual_tag"
        tagged = await self.repository.tag_paper_keyword(
            paper_id=paper_id,
            keyword_id=data.keyword_id,
            confidence=confidence,
            source="manual",
            reason=reason,
        )
        
        # Sync to paper document
        await self._sync_paper_keywords(paper_id, owner_uid)
        
        return PaperKeywordResponse(**tagged)

    async def list_paper_keywords(self, paper_id: str, owner_uid: str) -> PaperKeywordListResponse:
        """論文のキーワード一覧を取得"""
        await self._ensure_paper_access(owner_uid, paper_id)

        items = await self.repository.list_paper_keywords(paper_id, owner_uid)
        keywords = [PaperKeywordResponse(**item) for item in items]
        return PaperKeywordListResponse(keywords=keywords, total=len(keywords))

    async def untag_paper(self, paper_id: str, keyword_id: str, owner_uid: str) -> None:
        """論文からキーワードを解除"""
        keyword = await self.repository.get_by_id(keyword_id, owner_uid)
        if not keyword:
            raise HTTPException(status_code=404, detail="keyword not found")

        await self._ensure_paper_access(owner_uid, paper_id)

        removed = await self.repository.untag_paper_keyword(paper_id, keyword_id)
        if not removed:
            raise HTTPException(status_code=404, detail="paper keyword not found")

        # Sync to paper document
        await self._sync_paper_keywords(paper_id, owner_uid)

    async def _ensure_paper_access(self, owner_uid: str, paper_id: str) -> None:
        """
        論文アクセス検証。
        現在はlikesベースの判定だが、ownerUid導入後にこの関数のみ置換する。
        """
        paper = await self.paper_repository.get_by_id(paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="paper not found")

        liked_ids = await self.paper_repository.get_user_likes(owner_uid)
        if paper_id not in liked_ids:
            raise HTTPException(status_code=403, detail="paper is not in your library")

    async def suggest(self, paper_id: str) -> list[dict]:
        raise NotImplementedError

    async def suggest_and_apply(
        self,
        paper_id: str,
        owner_uid: str,
    ) -> KeywordSuggestionResponse:
        """
        自動キーワード推薦（モック）を生成して論文へ反映する。
        - manualタグは保持
        - autoタグは再計算ごとに置換
        """
        await self._ensure_paper_access(owner_uid, paper_id)

        paper = await self.paper_repository.get_by_id(paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="paper not found")

        owner_keywords = await self.repository.list_by_owner(owner_uid)
        owner_labels = [k.get("label", "") for k in owner_keywords if k.get("label")]

        suggested = await suggest_keywords_llm(
            title=paper.get("title", ""),
            abstract=paper.get("abstract", ""),
            owner_keyword_labels=owner_labels,
            limit=5,
        )

        # 既存manualタグは温存、autoタグは入れ替える
        current = await self.repository.list_paper_keywords(paper_id, owner_uid)
        manual_keyword_ids = {
            item.get("keyword_id")
            for item in current
            if item.get("source") == "manual" and item.get("keyword_id")
        }
        await self.repository.delete_paper_keywords_by_source(paper_id, "auto")

        applied: list[KeywordSuggestionItem] = []
        for item in suggested:
            keyword = await self.repository.get_by_label(owner_uid, item.label)
            if not keyword:
                keyword = await self.repository.create(
                    owner_uid=owner_uid,
                    data={"label": item.label, "description": ""},
                )

            keyword_id = keyword["id"]
            if keyword_id in manual_keyword_ids:
                continue

            await self.repository.tag_paper_keyword(
                paper_id=paper_id,
                keyword_id=keyword_id,
                confidence=item.confidence,
                source="auto",
                reason=item.reason,
            )
            applied.append(
                KeywordSuggestionItem(
                    keyword_id=keyword_id,
                    label=keyword["label"],
                    confidence=item.confidence,
                    source="auto",
                    reason=item.reason,
                )
            )

        # Sync to paper document
        await self._sync_paper_keywords(paper_id, owner_uid)

        return KeywordSuggestionResponse(
            paper_id=paper_id,
            suggestions=applied,
            total=len(applied),
        )

    async def suggest_for_new_library_paper(self, paper_id: str, owner_uid: str) -> None:
        """
        ライブラリ新規追加時の自動推薦フック。
        失敗しても主フロー（Like処理）は止めない。
        """
        try:
            await self.suggest_and_apply(paper_id, owner_uid)
        except Exception as exc:  # noqa: BLE001
            logger.warning("auto keyword suggestion failed: %s", exc)


    async def _sync_paper_keywords(self, paper_id: str, owner_uid: str) -> None:
        """
        論文のキーワード一覧をPaperドキュメントのkeywords/prerequisiteKeywordsフィールドに同期する。
        """
        try:
            items = await self.repository.list_paper_keywords(paper_id, owner_uid)
            
            keywords = []
            prerequisite_keywords = []
            
            for item in items:
                label = item.get("label", "")
                if not label:
                    continue
                
                reason = item.get("reason", "")
                
                # 事前知識キーワードの判定 (reasonに "prerequisite" が含まれる場合)
                if "prerequisite" in reason:
                    prerequisite_keywords.append(label)
                else:
                    keywords.append(label)
            
            # Update paper document
            await self.paper_repository.update(paper_id, {
                "keywords": keywords,
                "prerequisiteKeywords": prerequisite_keywords
            })
            
        except Exception as e:
            logger.error(f"Failed to sync paper keywords: {e}")


keyword_service = KeywordService()
