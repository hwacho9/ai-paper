"""D-05: 埋め込み生成"""

import logging
import vertexai
from vertexai.language_models import TextEmbeddingInput, TextEmbeddingModel
from app.core.config import settings

logger = logging.getLogger(__name__)

# モデル定数
MODEL_NAME = "text-embedding-004"
BATCH_SIZE = 5  # Vertex AIの制限に合わせて調整

def generate_embeddings(chunks: list[dict]) -> list[dict]:
    """
    ChunkリストからEmbeddingを生成して付与する。
    
    Args:
        chunks: chunker.create_chunksの戻り値
        
    Returns:
        list[dict]: embeddingフィールドが追加されたChunkリスト
    """
    logger.info(f"埋め込み生成開始: {len(chunks)}チャンク")
    
    # Vertex AI初期化 (Worker起動時に一度だけやるのがベストだがここでも可)
    vertexai.init(project=settings.gcp_project_id, location=settings.gcp_region)
    
    model = TextEmbeddingModel.from_pretrained(MODEL_NAME)
    
    # バッチ処理
    enriched_chunks = []
    
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        texts = [chunk["text"] for chunk in batch]
        
        # Task Type: RETRIEVAL_DOCUMENT
        inputs = [TextEmbeddingInput(text=t, task_type="RETRIEVAL_DOCUMENT") for t in texts]
        
        try:
            embeddings = model.get_embeddings(inputs)
            
            for j, embedding in enumerate(embeddings):
                batch[j]["embedding"] = embedding.values
                enriched_chunks.append(batch[j])
                
        except Exception as e:
            logger.error(f"埋め込み生成エラー (batch {i}): {e}")
            raise e

    logger.info(f"埋め込み生成完了")
    return enriched_chunks
