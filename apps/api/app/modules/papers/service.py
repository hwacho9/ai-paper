"""D-03: ペーパーライブラリ - サービス"""


class PaperService:
    """論文ビジネスロジック"""

    async def create_paper(self, owner_uid: str, data: dict) -> dict:
        """論文保存"""
        # TODO(F-0301): 重複チェック + Firestore保存
        pass

    async def upload_pdf(self, paper_id: str, owner_uid: str, pdf_data) -> dict:
        """PDF登録→GCS保存→Pub/Sub発行"""
        # TODO(F-0302): GCSアップロード + paper.ingest.requested 発行
        pass

    async def like_paper(self, paper_id: str, owner_uid: str) -> None:
        """いいね保存 + メモ自動生成"""
        # TODO(F-0305): Like記録作成 + POST /memos でメモ作成
        pass
