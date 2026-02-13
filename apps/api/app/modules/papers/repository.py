"""D-03: ペーパーライブラリ - リポジトリ"""


class PaperRepository:
    """papers / likesコレクションのCRUD操作"""

    COLLECTION = "papers"
    LIKES_COLLECTION = "likes"

    async def create(self, data: dict) -> dict:
        """論文ドキュメント作成"""
        pass

    async def get_by_id(self, paper_id: str) -> dict | None:
        """論文取得"""
        pass

    async def list_by_owner(self, owner_uid: str, **filters) -> list[dict]:
        """オーナーの論文一覧"""
        pass

    async def update(self, paper_id: str, data: dict) -> dict:
        """論文更新"""
        pass

    async def delete(self, paper_id: str) -> None:
        """論文削除"""
        pass

    async def add_like(self, paper_id: str, owner_uid: str) -> None:
        """いいね追加"""
        pass

    async def remove_like(self, paper_id: str, owner_uid: str) -> None:
        """いいね削除"""
        pass
