"""
D-05: パイプラインWorker エントリーポイント

Cloud Run Jobsで実行されるWorkerのメインモジュール。
環境変数から paperId を受け取り、取り込みパイプラインを実行する。

TODO(F-0501): パイプライントリガー | AC: paperId受信→パイプライン実行 | owner:@
"""

import os
import sys
import logging
import asyncio

# プロジェクトルートをパスに追加 (dockerコンテナ内では/appがルートだが、ローカル実行時のため)
sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))

from worker.pipeline import ingest

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def main():
    """Cloud Run Job エントリーポイント"""
    paper_id = os.environ.get("PAPER_ID")
    owner_uid = os.environ.get("OWNER_UID")
    request_id = os.environ.get("REQUEST_ID", "unknown")
    pdf_url = os.environ.get("PDF_URL")
    pdf_url = os.environ.get("PDF_URL")

    if not paper_id:
        logger.error("PAPER_ID 環境変数が設定されていません")
        # テスト用ダミーデータ (開発時のみ有効にすると便利)
        # paper_id = "test-paper-id"
        # owner_uid = "test-user-id"
        sys.exit(1)

    logger.info(
        f"パイプライン開始: paperId={paper_id}",
        extra={"requestId": request_id, "paperId": paper_id, "step": "start"},
    )

    try:
        # ingest パイプライン呼び出し
        await ingest.run_ingest(paper_id=paper_id, owner_uid=owner_uid, request_id=request_id, pdf_url=pdf_url)

        logger.info("パイプライン完了", extra={"paperId": paper_id, "step": "complete"})
    except Exception as e:
        logger.error(f"パイプライン失敗: {e}", extra={"paperId": paper_id, "step": "failed"})
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
