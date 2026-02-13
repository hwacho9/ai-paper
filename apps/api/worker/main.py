"""
D-05: パイプラインWorker エントリーポイント

Cloud Run Jobsで実行されるWorkerのメインモジュール。
環境変数から paperId を受け取り、取り込みパイプラインを実行する。

TODO(F-0501): パイプライントリガー | AC: paperId受信→パイプライン実行 | owner:@
"""

import os
import sys
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main():
    """Cloud Run Job エントリーポイント"""
    paper_id = os.environ.get("PAPER_ID")
    owner_uid = os.environ.get("OWNER_UID")
    request_id = os.environ.get("REQUEST_ID", "unknown")

    if not paper_id:
        logger.error("PAPER_ID 環境変数が設定されていません")
        sys.exit(1)

    logger.info(
        "パイプライン開始",
        extra={"requestId": request_id, "paperId": paper_id, "step": "start"},
    )

    try:
        # TODO(F-0501): ingest パイプライン呼び出し
        # from worker.pipeline.ingest import run_ingest
        # run_ingest(paper_id=paper_id, owner_uid=owner_uid, request_id=request_id)

        logger.info("パイプライン完了", extra={"paperId": paper_id, "step": "complete"})
    except Exception as e:
        logger.error(f"パイプライン失敗: {e}", extra={"paperId": paper_id, "step": "failed"})
        # TODO(F-0505): Firestoreのstatus=FAILED更新
        sys.exit(1)


if __name__ == "__main__":
    main()
