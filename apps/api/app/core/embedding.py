"""
Vertex AI Embedding Utility
"""
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingInput, TextEmbeddingModel
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Model constant (should match worker)
MODEL_NAME = "text-embedding-004"

def generate_embedding(text: str) -> list[float]:
    """
    Generate embedding for a single text string.
    """
    if not text:
        return []

    try:
        model = TextEmbeddingModel.from_pretrained(MODEL_NAME)
        inputs = [TextEmbeddingInput(text=text, task_type="RETRIEVAL_DOCUMENT")] # or RETRIEVAL_QUERY?
        
        # For searching related papers (paper-to-paper), DOCUMENT or QUERY?
        # If we are finding customizable papers, maybe QUERY is better if we treat the source paper as a query.
        # But 'RETRIEVAL_QUERY' is for short queries. A paper abstract is long.
        # 'SEMANTIC_SIMILARITY' might be best for STS tasks?
        # Vertex AI docs say: RETRIEVAL_QUERY for query, RETRIEVAL_DOCUMENT for corpus.
        # Let's use RETRIEVAL_QUERY for now as we are "querying" the index.
        inputs = [TextEmbeddingInput(text=text, task_type="RETRIEVAL_QUERY")]
        
        embeddings = model.get_embeddings(inputs)
        if not embeddings:
            return []
            
        return embeddings[0].values
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return []
