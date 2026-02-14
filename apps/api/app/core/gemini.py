"""
Gemini API Client (Fallback for Paper Search)
"""
import httpx
import json
import os
import uuid
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class GeminiClient:
    def __init__(self):
        self.project_id = settings.gcp_project_id
        self.location = settings.gcp_region
        self.model_name = os.getenv("GOOGLE_MODEL_NAME", "gemini-1.5-flash")
        self.model = None
        self._init_vertex_ai()
        
    def _init_vertex_ai(self):
        """Vertex AI の初期化（失敗時は None に設定）"""
        try:
            import vertexai
            vertexai.init(project=self.project_id, location=self.location)
            
            from vertexai.generative_models import GenerativeModel
            self.model = GenerativeModel(self.model_name)
            logger.info("Vertex AI initialized successfully")
        except Exception as exc:
            logger.warning(f"Failed to initialize Vertex AI: {exc}. Will use mock suggestions.")
            self.model = None

    async def search_papers(self, query: str, limit: int = 10) -> dict:
        """
        Ask Gemini to recommend papers based on the query.
        This is a fallback and results might be hallucinations.
        """
        prompt = f"""
        List {limit} academic papers related to "{query}".
        IMPORTANT: Return ONLY papers that have a valid DOI (Digital Object Identifier).
        If a paper does not have a DOI, do NOT include it in the list.
        
        Return ONLY a raw JSON object (no markdown formatting).
        The JSON should be a list of objects with the following keys:
        - title: str
        - authors: list[str]
        - year: int
        - venue: str (or "arXiv")
        - abstract: str (brief summary)
        - externalIds: {{ "ArXiv": str, "DOI": str }} (DOI is required. ArXiv ID is strongly recommended if available)
        
        Example:
        [
          {{
            "title": "Attention Is All You Need",
            "authors": ["Vaswani, A.", "Shazeer, N."],
            "year": 2017,
            "venue": "NeurIPS",
            "abstract": "...",
            "externalIds": {{ "ArXiv": "1706.03762", "DOI": "10.5555/3295222.3295349" }}
          }}
        ]
        """

        try:
            # Run in executor because Vertex AI SDK is synchronous (mostly)
            # or use async_generate_content if available (newer versions)
            response = await self.model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            text_content = response.text
            papers = json.loads(text_content)
            
            # Normalize to match Semantic Scholar response structure roughly
            # We wrap it in the expected dict structure
            return {
                "data": [
                    {
                        "paperId": str(uuid.uuid4()), 
                        "title": p.get("title"),
                        "authors": [{"name": a} for a in p.get("authors", [])],
                        "year": p.get("year"),
                        "venue": p.get("venue"),
                        "abstract": p.get("abstract"),
                        "externalIds": p.get("externalIds", {}),
                        "citationCount": 0,
                        "openAccessPdf": p.get("openAccessPdf") 
                    }
                    for i, p in enumerate(papers)
                ],
                "total": len(papers)
            }
        except Exception as e:
            print(f"Gemini Vertex AI Error: {e}")
            raise e

    async def generate_paper_keywords(self, title: str, abstract: str) -> dict:
        """
        論文のタイトルとAbstractから、キーワードと事前知識キーワードを英語で生成する。
        
        Returns:
            dict: {"keywords": [...], "prerequisite_keywords": [...]}
        """
        if not self.model:
            logger.warning("Vertex AI not available, using fallback suggestions")
            return {"keywords": [], "prerequisite_keywords": []}
            
        prompt = f"""You are an academic paper analysis assistant.
Given the following paper title and abstract, generate two sets of keywords IN ENGLISH:

1. "keywords": 5-8 keywords that describe the main topics, methods, and contributions of this paper.
2. "prerequisite_keywords": 5-8 keywords representing the prerequisite knowledge a reader needs to understand this paper (e.g., foundational concepts, mathematical/algorithmic background, related fields).

Paper Title: {title}

Abstract: {abstract if abstract else "(No abstract available)"}

Return ONLY a raw JSON object (no markdown formatting, no code blocks).
Example:
{{
  "keywords": ["transformer", "self-attention", "sequence-to-sequence", "machine translation", "neural network architecture"],
  "prerequisite_keywords": ["recurrent neural networks", "attention mechanism", "encoder-decoder", "backpropagation", "linear algebra"]
}}
"""
        try:
            response = await self.model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            result = json.loads(response.text)
            
            # Ensure the expected keys exist
            return {
                "keywords": result.get("keywords", []),
                "prerequisite_keywords": result.get("prerequisite_keywords", [])
            }
        except Exception as e:
            logger.warning(f"Gemini Keyword Generation Error: {e}")
            # Return empty on failure (non-blocking)
            return {"keywords": [], "prerequisite_keywords": []}

    async def explain_paper(self, title: str, abstract: str, question: str) -> str | None:
        """
        論文タイトル/Abstractに基づいて日本語で説明を返す。
        Vertex AI が使えない場合は None を返す。
        """
        if not self.model:
            return None

        prompt = f"""あなたは研究支援アシスタントです。
以下の論文情報だけを根拠に、日本語でわかりやすく説明してください。
不明な情報は推測せず「不明」と明示してください。

ユーザー質問:
{question}

論文タイトル:
{title}

Abstract:
{abstract if abstract else "(No abstract available)"}

出力フォーマット:
1) 要点（3点）
2) 何が新しいか
3) どんな人が先に読むべきか
"""
        try:
            response = await self.model.generate_content_async(prompt)
            text = (response.text or "").strip()
            return text or None
        except Exception as e:
            logger.warning(f"Gemini Paper Explanation Error: {e}")
            return None

# Singleton
gemini_client = GeminiClient()
