"""D-05: Vector Searchインデクサー"""

import logging
from google.cloud import aiplatform
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
    # インデックスIDチェック
    index_id = settings.vector_index_id
    if not index_id or index_id == "your-vector-index-id":
        logger.warning(f"VECTOR_INDEX_IDが未設定またはプレフィックス({index_id})のため、インデックス更新をスキップします(Mock)。")
        return

    logger.info(f"インデックス更新開始: {index_id} ({len(chunks)} records)")
    
    # AI Platform初期化
    aiplatform.init(project=settings.gcp_project_id, location=settings.gcp_region)
    
    # Index Endpointの取得 (通常はIndexEndpointにデプロイされているIndexを更新するのではなく、
    # Indexそのものを更新する => Stream Update)
    # ここではIndexリソースを直接取得してupsert_datapointsを呼ぶ
    
    try:
        my_index = aiplatform.MatchingEngineIndex(index_name=index_id)
        
        # Datapoint作成
        datapoints = []
        for chunk in chunks:
            if "embedding" not in chunk:
                continue
                
            datapoints.append({
                "id": chunk["chunk_id"],
                "embedding": chunk["embedding"],
                "restricts": [
                    {"namespace": "paper_id", "allow": [paper_id]},
                    {"namespace": "owner_uid", "allow": [owner_uid]}
                ]
            })
            
        # アップサート実行
        # 注意: Python SDKのupsert_datapointsはIndexEndpoint経由ではなくIndexに対して行う場合もあるが、
        # stream update対応のIndexである必要がある。
        my_index.upsert_datapoints(datapoints=datapoints)
        
        logger.info("インデックス更新リクエスト完了")
        
    except Exception as e:
        logger.error(f"インデックス更新失敗: {e}")
        # 開発環境等でIndexが存在しない場合はエラーになるが、パイプライン全体を止めない選択肢もあり
        raise e
