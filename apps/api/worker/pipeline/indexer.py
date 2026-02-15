"""D-05: Vector Searchインデクサー"""

import logging
from google.cloud import aiplatform
from google.cloud.aiplatform.compat.types import matching_engine_index as gca_matching_engine_index
from app.core.config import settings

logger = logging.getLogger(__name__)


def upsert_index(paper_id: str, chunks: list[dict], owner_uid: str) -> None:
    """
    Vertex AI Vector Searchにベクトルをアップサートする。

    Args:
        paper_id: 論文ID (metadataに使用)
        chunks: embedding付きのChunkリスト
        owner_uid: 所有者UID (metadataに使用)
    """
    index_id = settings.vector_index_id
    if not index_id or index_id == "your-vector-index-id":
        logger.warning(
            "VECTOR_INDEX_IDが未設定のため、インデックス更新をスキップします(Mock)。"
        )
        return

    logger.info(f"インデックス更新開始: {index_id} ({len(chunks)} records)")

    aiplatform.init(project=settings.gcp_project_id, location=settings.gcp_region)

    try:
        my_index = aiplatform.MatchingEngineIndex(index_name=index_id)

        # IndexDatapoint は proto オブジェクトで渡す（dict だと "id" 等のフィールド名でエラーになるため）
        datapoints = []
        for chunk in chunks:
            if "embedding" not in chunk:
                continue

            restricts = [
                gca_matching_engine_index.IndexDatapoint.Restriction(
                    namespace="paper_id",
                    allow_list=[paper_id],
                ),
                gca_matching_engine_index.IndexDatapoint.Restriction(
                    namespace="owner_uid",
                    allow_list=[owner_uid],
                ),
            ]
            dp = gca_matching_engine_index.IndexDatapoint(
                datapoint_id=chunk["chunk_id"],
                feature_vector=chunk["embedding"],
                restricts=restricts,
            )
            datapoints.append(dp)

        my_index.upsert_datapoints(datapoints=datapoints)
        logger.info("インデックス更新リクエスト完了")

    except Exception as e:
        logger.error(f"インデックス更新失敗: {e}")
        raise e
