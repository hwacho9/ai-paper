"""
Gemini API Client (Fallback for Paper Search)
"""
import httpx
import json
import os
import uuid
from app.core.config import settings

class GeminiClient:
    def __init__(self):
        self.project_id = settings.gcp_project_id
        self.location = settings.gcp_region
        self.model_name = os.getenv("GOOGLE_MODEL_NAME", "gemini-1.5-flash")
        
        # Initialize Vertex AI
        import vertexai
        vertexai.init(project=self.project_id, location=self.location)
        
        from vertexai.generative_models import GenerativeModel
        self.model = GenerativeModel(self.model_name)

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

# Singleton
gemini_client = GeminiClient()
