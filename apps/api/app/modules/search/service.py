"""D-04: 論文検索 - サービス"""


class SearchService:
    """外部論文検索プロキシ"""

    async def search(self, query: str, **filters) -> dict:
        """外部API（Semantic Scholar）で検索"""
        # TODO(F-0401): Semantic Scholar APIの呼び出し
        # TODO: 結果をSearchResultItemに正規化
        # TODO: ユーザーのライブラリと照合してis_in_libraryを設定
        pass
