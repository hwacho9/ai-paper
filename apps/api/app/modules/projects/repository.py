"""D-02: プロジェクト - リポジトリ"""


class ProjectRepository:
    """projectsコレクションのCRUD操作"""

    COLLECTION = "projects"
    PAPERS_SUBCOLLECTION = "papers"

    async def create(self, data: dict) -> dict:
        """プロジェクト作成"""
        # TODO: Firestoreにドキュメント追加
        pass

    async def get_by_id(self, project_id: str, owner_uid: str) -> dict | None:
        """プロジェクト取得（ownerUid検証）"""
        # TODO: Firestoreからドキュメント取得
        pass

    async def list_by_owner(self, owner_uid: str) -> list[dict]:
        """オーナーのプロジェクト一覧"""
        # TODO: ownerUidでフィルターして取得
        pass

    async def update(self, project_id: str, data: dict) -> dict:
        """プロジェクト更新"""
        pass

    async def delete(self, project_id: str) -> None:
        """プロジェクト削除"""
        pass

    async def add_paper(self, project_id: str, paper_data: dict) -> dict:
        """参照論文追加"""
        pass

    async def remove_paper(self, project_id: str, paper_id: str) -> None:
        """参照論文削除"""
        pass
