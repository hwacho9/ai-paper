"""
D-04: 論文検索 - サービス
"""
from app.core.gemini import gemini_client
from app.modules.papers.repository import PaperRepository
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse
from fastapi import HTTPException

class SearchService:
    def __init__(self):
        self.gemini_client = gemini_client
        self.paper_repository = PaperRepository()

    async def search_papers(
        self,
        uid: str,
        query: str,
        year_from: int | None = None,
        year_to: int | None = None,
        author: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResultListResponse:
        """
        Gemini検索結果を内部スキーマに正規化し、後段フィルターを適用して返す。
        """
        try:
            fetch_limit = min(max(limit + offset, limit), 100)
            raw_data = await self.gemini_client.search_papers(query, limit=fetch_limit)
            liked_id_set = set(await self.paper_repository.get_user_likes(uid))
            items = []
            for paper in raw_data.get("data", []):
                paper_id = self._resolve_paper_id(paper)
                items.append(
                    self._normalize_paper(
                        paper=paper,
                        paper_id=paper_id,
                        is_in_library=paper_id in liked_id_set,
                    ),
                )
            filtered_items = self._apply_filters(
                items=items,
                year_from=year_from,
                year_to=year_to,
                author=author,
            )
            paged_items = filtered_items[offset : offset + limit]

            return SearchResultListResponse(
                results=paged_items,
                total=len(filtered_items),
                offset=offset,
                limit=limit
            )
        except Exception as e:
            print(f"Gemini API Error: {e}")
            raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

    def _resolve_paper_id(self, paper: dict) -> str:
        """検索結果から論文IDを決定する。"""
        paper_id = paper.get("paperId")
        if paper_id:
            return paper_id

        import uuid
        return f"gen-{uuid.uuid4()}"

    def _normalize_paper(
        self,
        paper: dict,
        paper_id: str,
        is_in_library: bool,
    ) -> SearchResultItem:
        # Authors
        authors = [a.get("name") for a in paper.get("authors", []) if a.get("name")]
        
        # External IDs
        ext_ids = paper.get("externalIds", {})
        doi = ext_ids.get("DOI")
        arxiv_id = ext_ids.get("ArXiv")
        
        # PDF URL (OpenAccess)
        pdf_url = paper.get("openAccessPdf", {}).get("url") if paper.get("openAccessPdf") else None
        if not pdf_url and arxiv_id:
            pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

        return SearchResultItem(
            external_id=paper_id,
            source="gemini",
            title=paper.get("title", "No Title"),
            authors=authors,
            year=paper.get("year"),
            venue=paper.get("venue", ""),
            abstract=paper.get("abstract") or "",
            doi=doi,
            arxiv_id=arxiv_id,
            pdf_url=pdf_url,
            citation_count=paper.get("citationCount"),
            is_in_library=is_in_library,
        )

    def _apply_filters(
        self,
        items: list[SearchResultItem],
        year_from: int | None = None,
        year_to: int | None = None,
        author: str | None = None,
    ) -> list[SearchResultItem]:
        """取得済み検索結果に年度・著者フィルターを適用する。"""
        filtered = items

        if year_from is not None:
            filtered = [item for item in filtered if item.year is not None and item.year >= year_from]

        if year_to is not None:
            filtered = [item for item in filtered if item.year is not None and item.year <= year_to]

        if author and author.strip():
            author_lc = author.strip().lower()
            filtered = [
                item
                for item in filtered
                if any(author_lc in author_name.lower() for author_name in item.authors)
            ]

        return filtered

search_service = SearchService()
