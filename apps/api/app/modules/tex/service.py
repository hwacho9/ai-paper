"""D-10: TeX - サービス"""
class TexService:
    async def generate_bibtex(self, project_id: str) -> str:
        # TODO(F-1003): プロジェクト参照論文からBibTeX生成
        pass
    async def generate_cite_key(self, paper: dict) -> str:
        # TODO(F-1002): "{著者姓}{年}{タイトル最初の単語}" 形式
        pass
