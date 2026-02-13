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
            await self.repository.create(paper_id, paper_data.model_dump())

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

paper_service = PaperService()
