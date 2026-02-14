"""
D-03: ペーパーライブラリ - サービス
"""
from app.modules.papers.repository import PaperRepository
from app.modules.papers.schemas import PaperCreate, PaperResponse, PaperListResponse
from app.modules.memos.service import memo_service 

class PaperService:
    def __init__(self):
        self.repository = PaperRepository()

    async def toggle_like(self, uid: str, paper_data: PaperCreate) -> bool:
        """
        いいねをトグル（ON/OFF）する。
        論文がDBになければ作成する。
        いいねON時にメモを自動生成する。
        
        Returns:
            bool: トグル後の状態 (True: Liked, False: Unliked)
        """
        paper_id = paper_data.external_id
        
        # 1. 論文がDBにあるか確認、なければ作成
        paper = await self.repository.get_by_id(paper_id)
        if not paper:
            paper = await self.repository.create(paper_id, paper_data.model_dump())

        # 2. 現在のいいね状態を確認
        user_likes = await self.repository.get_user_likes(uid)
        is_liked = paper_id in user_likes

        if is_liked:
            # Unlike
            await self.repository.remove_like(uid, paper_id)
            return False
        else:
            # Like
            await self.repository.add_like(uid, paper_id)
            # メモ自動生成トリガー
            await memo_service.create_auto_memo(uid, paper_id, paper_data.title)
            # キーワード自動推薦（モック）
            from app.modules.keywords.service import keyword_service
            await keyword_service.suggest_for_new_library_paper(paper_id, uid)
            
            # Ingestion Trigger (Auto-Ingest)
            # URLがある場合のみトリガー
            if paper_data.pdf_url:
                from app.core.cloud_run import execute_ingest_job
                import uuid
                request_id = f"auto-{uuid.uuid4()}"
                await execute_ingest_job(paper["id"], uid, request_id, pdf_url=paper.get("pdf_url"))
            
            return True

    async def get_user_library(self, uid: str) -> PaperListResponse:
        """ユーザーのライブラリ（いいねした論文）を取得"""
        # 1. いいねID一覧取得
        liked_ids = await self.repository.get_user_likes(uid)
        
        # 2. 論文詳細取得
        papers_data = await self.repository.get_papers_by_ids(liked_ids)
        
        # 3. レスポンス整形
        papers = []
        for p in papers_data:
            papers.append(PaperResponse(
                **p,
                is_liked=True # ライブラリ一覧なので全てLiked
            ))
            
        return PaperListResponse(
            papers=papers,
            total=len(papers)
        )

    async def get_paper(self, paper_id: str, uid: str | None = None) -> PaperResponse | None:
        """論文詳細取得"""
        paper = await self.repository.get_by_id(paper_id)
        if not paper:
            return None
        
        is_liked = False
        if uid:
            user_likes = await self.repository.get_user_likes(uid)
            is_liked = paper_id in user_likes
            
        return PaperResponse(**paper, is_liked=is_liked)

    async def ingest_paper(self, paper_id: str, uid: str) -> bool:
        """
        論文のインジェスト（解析）を手動トリガーする。
        既にPDFがStorageにあることを前提とする（直接アップロード後など）。
        """
        # 論文存在確認
        paper = await self.repository.get_by_id(paper_id)
        if not paper:
            return False

        # Job実行
        from app.core.cloud_run import execute_ingest_job
        import uuid
        request_id = f"manual-{uuid.uuid4()}"
        
        # URLは渡さない（Storageにある前提）
        await execute_ingest_job(paper_id, uid, request_id)
        return True

paper_service = PaperService()
