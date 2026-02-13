"""
Gemini API Client (Fallback for Paper Search)
"""
import httpx
import json
import os
from app.core.config import settings

class GeminiClient:
    # BASE_URL will be constructed dynamically
    
    def __init__(self):
        self.api_key = settings.google_api_key
        self.model_name = os.getenv("GOOGLE_MODEL_NAME", "gemini-1.5-flash")
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent"

    async def search_papers(self, query: str, limit: int = 10) -> dict:
        """
        Ask Gemini to recommend papers based on the query.
        This is a fallback and results might be hallucinations.
        """
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY is not set")

        prompt = f"""
        List {limit} academic papers related to "{query}".
        Return ONLY a raw JSON object (no markdown formatting).
        The JSON should be a list of objects with the following keys:
        - title: str
        - authors: list[str]
        - year: int
        - venue: str (or "arXiv")
        - abstract: str (brief summary)
        - externalIds: {{ "ArXiv": str, "DOI": str }} (if known, else empty)
        
        Example:
        [
          {{
            "title": "Attention Is All You Need",
            "authors": ["Vaswani, A.", "Shazeer, N."],
            "year": 2017,
            "venue": "NeurIPS",
            "abstract": "...",
            "externalIds": {{ "ArXiv": "1706.03762" }}
          }}
        ]
        """

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}?key={self.api_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"response_mime_type": "application/json"}
                },
                timeout=20.0
            )
            response.raise_for_status()
            data = response.json()
            
            try:
                text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                papers = json.loads(text_content)
                
                # Normalize to match Semantic Scholar response structure roughly
                # We wrap it in the expected dict structure
                return {
                    "data": [
                        {
                            "paperId": f"gemini-{i}", # Dummy ID
                            "title": p.get("title"),
                            "authors": [{"name": a} for a in p.get("authors", [])],
                            "year": p.get("year"),
                            "venue": p.get("venue"),
                            "abstract": p.get("abstract"),
                            "externalIds": p.get("externalIds", {}),
                            "citationCount": 0,
                            "openAccessPdf": None 
                        }
                        for i, p in enumerate(papers)
                    ],
                    "total": len(papers)
                }
            except (KeyError, json.JSONDecodeError) as e:
                print(f"Gemini Parse Error: {e}")
                return {"data": [], "total": 0}

# Singleton
gemini_client = GeminiClient()
