"""D-02: プロジェクト - サービス"""

from fastapi import HTTPException, status
from app.modules.projects.repository import ProjectRepository


class ProjectService:
    """プロジェクトビジネスロジック"""

    def __init__(self):
        self.repository = ProjectRepository()

    async def create_project(self, owner_uid: str, data: dict) -> dict:
        """プロジェクト作成（seed papers対応）"""
        project = await self.repository.create({
            "owner_uid": owner_uid,
            "title": data["title"],
            "description": data.get("description", ""),
        })

        # seedPaperIdsがある場合、参照論文も追加
        seed_ids = data.get("seed_paper_ids", [])
        for paper_id in seed_ids:
            await self.repository.add_paper(project["id"], {"paper_id": paper_id})

        if seed_ids:
            project["paper_count"] = len(seed_ids)

        # Invalidate Graph Cache
        from app.modules.related.service import related_service
        await related_service.invalidate_user_graph_cache(owner_uid)

        return project

    async def get_project(self, project_id: str, owner_uid: str) -> dict:
        """プロジェクト詳細取得"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        return project

    async def list_projects(self, owner_uid: str) -> list[dict]:
        """プロジェクト一覧"""
        return await self.repository.list_by_owner(owner_uid)

    async def update_project(self, project_id: str, owner_uid: str, data: dict) -> dict:
        """プロジェクト更新"""
        project = await self.repository.update(project_id, owner_uid, data)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        return project

    async def delete_project(self, project_id: str, owner_uid: str) -> None:
        """プロジェクト削除"""
        deleted = await self.repository.delete(project_id, owner_uid)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )

        # Invalidate Graph Cache
        from app.modules.related.service import related_service
        await related_service.invalidate_user_graph_cache(owner_uid)

    async def add_paper(self, project_id: str, paper_id: str, owner_uid: str, note: str = "", role: str = "reference") -> dict:
        """参照論文追加"""
        # オーナー検証
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        result = await self.repository.add_paper(project_id, {
            "paper_id": paper_id,
            "note": note,
            "role": role,
        })
        
        # Invalidate Graph Cache
        from app.modules.related.service import related_service
        await related_service.invalidate_user_graph_cache(owner_uid)
        
        return result

    async def remove_paper(self, project_id: str, paper_id: str, owner_uid: str) -> None:
        """参照論文削除"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        removed = await self.repository.remove_paper(project_id, paper_id)
        if not removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="論文が見つかりません。",
            )

        # Invalidate Graph Cache
        from app.modules.related.service import related_service
        await related_service.invalidate_user_graph_cache(owner_uid)

    async def get_project_papers(self, project_id: str, owner_uid: str) -> list[dict]:
        """プロジェクトの参照論文一覧"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        return await self.repository.get_project_papers(project_id)


project_service = ProjectService()
