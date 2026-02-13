"""D-02: プロジェクト - サービス"""


class ProjectService:
    """プロジェクトビジネスロジック"""

    async def create_project(self, owner_uid: str, data: dict) -> dict:
        """プロジェクト作成（seed papers対応）"""
        # TODO(F-0201): Firestoreにプロジェクト作成
        # TODO(F-0205): seedPaperIdsがある場合、参照論文も追加
        pass

    async def add_paper(self, project_id: str, paper_id: str, owner_uid: str) -> dict:
        """参照論文追加"""
        # TODO(F-0202): ライブラリに存在確認→紐付け
        pass

    async def export_bibtex(self, project_id: str, owner_uid: str) -> str:
        """BibTeX export"""
        # TODO(F-0204): プロジェクト参照論文からBibTeX生成
        pass
