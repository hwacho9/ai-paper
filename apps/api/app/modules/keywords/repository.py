"""D-06: キーワード - リポジトリ"""
class KeywordRepository:
    COLLECTION = "keywords"
    async def create(self, data: dict) -> dict: pass
    async def get_by_id(self, keyword_id: str) -> dict | None: pass
    async def list_by_owner(self, owner_uid: str) -> list[dict]: pass
    async def update(self, keyword_id: str, data: dict) -> dict: pass
    async def delete(self, keyword_id: str) -> None: pass
