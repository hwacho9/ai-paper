"""D-10: TeX - リポジトリ"""
class TexRepository:
    COLLECTION = "tex_docs"
    CITATIONS_SUBCOLLECTION = "citations"
    async def create(self, data: dict) -> dict: pass
    async def get_by_id(self, texdoc_id: str) -> dict | None: pass
    async def list_by_project(self, project_id: str) -> list[dict]: pass
    async def update(self, texdoc_id: str, data: dict) -> dict: pass
    async def add_citation(self, texdoc_id: str, data: dict) -> dict: pass
