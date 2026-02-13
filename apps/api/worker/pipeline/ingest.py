"""
D-05: パイプライン オーケストレーター

パース→チャンク→埋め込み→インデックスの順にパイプラインを実行する。
冪等（同じpaperIdで再実行可能）。

TODO(F-0501~F-0505): パイプライン全ステップ | AC: parse→chunk→embed→index順次実行、idempotent | owner:@
"""

import logging

logger = logging.getLogger(__name__)


def run_ingest(paper_id: str, owner_uid: str | None = None, request_id: str = "") -> None:
    """
    取り込みパイプラインを実行する。

    ステップ:
    1. Firestoreのstatus=INGESTINGに更新
    2. GCSからPDFダウンロード
    3. PDFパース（テキスト/セクション抽出）
    4. チャンク生成（セクション/ページ/オフセット メタ付き）
    5. Vertex AI Embedding生成
    6. Vector Searchインデックス更新
    7. Firestoreのstatus=READYに更新
    """
    logger.info(f"[{request_id}] インジェスト開始: {paper_id}")

    # TODO(F-0505): Firestoreのstatus=INGESTINGに更新
    # _update_status(paper_id, "INGESTING")

    # TODO(F-0502): PDFパース
    # from worker.pipeline.parser import parse_pdf
    # sections = parse_pdf(paper_id)

    # TODO(F-0503): チャンク生成
    # from worker.pipeline.chunker import create_chunks
    # chunks = create_chunks(sections)

    # TODO(F-0504): 埋め込み生成
    # from worker.pipeline.embedder import generate_embeddings
    # embeddings = generate_embeddings(chunks)

    # TODO(F-0504): インデックス更新
    # from worker.pipeline.indexer import upsert_index
    # upsert_index(paper_id, embeddings)

    # TODO(F-0505): Firestoreのstatus=READYに更新
    # _update_status(paper_id, "READY")

    logger.info(f"[{request_id}] インジェスト完了: {paper_id}")
