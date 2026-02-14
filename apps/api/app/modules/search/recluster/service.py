"""
D-04: 論文検索再整理 - サービス
"""

import json
import logging
import time

from app.modules.search.schemas import (
    ReclusterSearchResponse,
    SearchResultItem,
)

logger = logging.getLogger(__name__)


class ReclusterSearchService:
    def __init__(self, gemini_client):
        self.gemini = gemini_client

    async def recluster_from_results(
        self,
        query: str,
        results: list[SearchResultItem],
        group_target: int = 4,
        include_related: bool = True,
    ) -> ReclusterSearchResponse:
        started_at = time.perf_counter()
        if not results:
            return ReclusterSearchResponse(
                query=query,
                clusters=[],
                uncertain_items=[],
                meta={
                    "fetched": 0,
                    "latency_ms": int((time.perf_counter() - started_at) * 1000),
                    "model": getattr(self.gemini, "model_name", "unknown"),
                    "fallback_used": False,
                },
            )

        if not self.gemini.model:
            return self._build_fallback_response(
                query=query,
                results=results,
                started_at=started_at,
            )

        prompt = self._build_recluster_prompt(
            query=query,
            candidates=results,
            group_target=group_target,
            include_related=include_related,
        )

        try:
            response = await self.gemini.model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"},
            )
            parsed = json.loads(response.text)
            validated = ReclusterSearchResponse(**parsed)
            validated.meta = {
                **validated.meta,
                "fetched": len(results),
                "latency_ms": int((time.perf_counter() - started_at) * 1000),
                "model": getattr(self.gemini, "model_name", "unknown"),
                "fallback_used": False,
            }
            return validated
        except Exception as exc:
            logger.warning("Recluster generation failed: %s", exc)
            return self._build_fallback_response(
                query=query,
                results=results,
                started_at=started_at,
            )

    def _build_recluster_prompt(
        self,
        query: str,
        candidates: list[SearchResultItem],
        group_target: int,
        include_related: bool,
    ) -> str:
        papers = []
        for item in candidates:
            papers.append(
                {
                    "paper_id": item.external_id,
                    "title": item.title,
                    "year": item.year,
                    "source": item.source,
                    "abstract": item.abstract,
                }
            )

        payload = json.dumps(papers, ensure_ascii=False)
        return f"""
You are an academic search organizer.
Reorganize papers for query: "{query}".
Return ONLY valid JSON (no markdown).

Rules:
- Create up to {group_target} groups in "clusters".
- Each cluster must have exactly one "hub_paper".
- Put derivative papers into "children".
- Put neighboring/adjacent papers into "related".
- include_related is {str(include_related).lower()}.
- Use only the provided paper_id values.
- If uncertain, place papers in "uncertain_items".
- Keep "score" between 0.0 and 1.0.

JSON schema:
{{
  "query": "string",
  "clusters": [
    {{
      "cluster_id": "string",
      "label": "string",
      "summary": "string",
      "hub_paper": {{
        "paper_id": "string",
        "title": "string",
        "year": 2020,
        "source": "string",
        "score": 0.0,
        "relation_type": null
      }},
      "children": [],
      "related": []
    }}
  ],
  "uncertain_items": [],
  "meta": {{}}
}}

Candidate papers:
{payload}
"""

    def _build_fallback_response(
        self,
        query: str,
        results: list[SearchResultItem],
        started_at: float,
    ) -> ReclusterSearchResponse:
        hub = results[0]
        return ReclusterSearchResponse(
            query=query,
            clusters=[
                {
                    "cluster_id": "fallback-1",
                    "label": "Fallback Group",
                    "summary": "LLM再整理に失敗したため、上位検索結果を表示しています。",
                    "hub_paper": {
                        "paper_id": hub.external_id,
                        "title": hub.title,
                        "year": hub.year,
                        "source": hub.source,
                        "score": 1.0,
                        "relation_type": None,
                    },
                    "children": [],
                    "related": [],
                }
            ],
            uncertain_items=[],
            meta={
                "fetched": len(results),
                "latency_ms": int((time.perf_counter() - started_at) * 1000),
                "model": getattr(self.gemini, "model_name", "unknown"),
                "fallback_used": True,
            },
        )
