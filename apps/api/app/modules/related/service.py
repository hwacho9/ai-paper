"""D-07: 関連グラフ - サービス"""
class RelatedService:
    async def get_related(self, paper_id: str) -> list[dict]:
        # TODO(F-0701): Vector Search + キーワード照合
        pass
    async def build_graph(self, project_id: str) -> dict:
        # TODO(F-0702): プロジェクト論文からグラフ構造生成
        pass
