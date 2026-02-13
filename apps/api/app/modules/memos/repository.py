"""D-08: メモ - リポジトリ"""


class MemoRepository:
    COLLECTION = "memos"

    async def create(self, data: dict) -> dict:
        pass

    async def get_by_id(self, memo_id: str) -> dict | None:
        pass

    async def list_by_owner(self, owner_uid: str) -> list[dict]:
        pass

    async def update(self, memo_id: str, data: dict) -> dict:
        pass

    async def delete(self, memo_id: str) -> None:
        pass
