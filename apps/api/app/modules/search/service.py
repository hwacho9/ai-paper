"""
D-04: 論文検索 - サービス
"""
import uuid

from fastapi import HTTPException

from app.core.gemini import gemini_client
from app.core.search import ArxivClient, PubmedClient, ScholarClient, SearchResult
from app.modules.papers.repository import PaperRepository
from app.modules.search.schemas import SearchResultItem, SearchResultListResponse

class SearchService:
    def __init__(self):
        self.arxiv = ArxivClient()
        self.pubmed = PubmedClient()
        self.scholar = ScholarClient()
        self.gemini = gemini_client
        self.paper_repository = PaperRepository()

    async def search_papers(
        self,
        query: str,
        uid: str,
        limit: int = 20,
        offset: int = 0,
        source: str = "arxiv",
        year_from: int | None = None,
        year_to: int | None = None,
        author: str | None = None,
    ) -> SearchResultListResponse:
        """
        論文を検索する。source引数で検索対象を指定可能。
        valid sources: "arxiv", "pubmed", "scholar", "gemini"
        """
        # フィルター後の件数不足を減らすため、検索取得件数は少し多めに読む
        fetch_limit = min(max(limit + offset, limit * 3, 20), 100)
        results: list[SearchResult] = []

        try:
            if source == "arxiv":
                results = await self.arxiv.search(query, fetch_limit)
            elif source == "pubmed":
                results = await self.pubmed.search(query, fetch_limit)
            elif source == "scholar":
                results = await self.scholar.search(query, fetch_limit)
            elif source == "gemini":
                # Gemini logic (Legacy/Fallback)
                raw_data = await self.gemini.search_papers(query, limit=fetch_limit)
                for p in raw_data.get("data", []):
                    results.append(
                        SearchResult(
                            title=p.get("title", ""),
                            authors=[a.get("name") for a in p.get("authors", [])],
                            year=p.get("year"),
                            venue=p.get("venue", ""),
                            abstract=p.get("abstract", ""),
                            external_ids=p.get("externalIds", {}),
                            pdf_url=(
                                p.get("openAccessPdf", {}).get("url")
                                if p.get("openAccessPdf")
                                else None
                            ),
                            source="gemini",
                        )
                    )
            else:
                # Default fallback
                results = await self.arxiv.search(query, fetch_limit)

        except Exception as e:
            print(f"Search API Error ({source}): {e}")
            raise HTTPException(status_code=500, detail=f"Search API Error: {str(e)}")

        # Convert to Response Schema
        items = [self._convert_to_item(result) for result in results]

        # F-0402: 年度/著者フィルター
        filtered = self._apply_filters(
            items,
            year_from=year_from,
            year_to=year_to,
            author=author,
        )

        # F-0403補助: ライブラリ存在判定
        filtered = await self._attach_library_flags(filtered, uid)

        # offset/limit を適用
        paged = filtered[offset : offset + limit]
        return SearchResultListResponse(
            results=paged,
            total=len(filtered),
            offset=offset,
            limit=limit,
        )

    def _convert_to_item(self, result: SearchResult) -> SearchResultItem:
        # ID handling
        paper_id = None

        # 1. Try to use stable external IDs
        if result.external_ids.get("ArXiv"):
            paper_id = result.external_ids["ArXiv"]
        elif result.external_ids.get("PubMed"):
            paper_id = f"pubmed:{result.external_ids['PubMed']}"
        elif result.external_ids.get("DOI"):
            doi = result.external_ids["DOI"]
            paper_id = f"doi:{uuid.uuid5(uuid.NAMESPACE_URL, doi)}"

        # 2. Fallback: build deterministic ID from bibliographic fields
        if not paper_id:
            fingerprint = "|".join(
                [
                    result.source,
                    result.title.strip().lower(),
                    ",".join(a.strip().lower() for a in result.authors[:3]),
                    str(result.year or ""),
                ]
            )
            paper_id = f"gen:{uuid.uuid5(uuid.NAMESPACE_URL, fingerprint)}"

        return SearchResultItem(
            external_id=paper_id,
            source=result.source,
            title=result.title,
            authors=result.authors,
            year=result.year,
            venue=result.venue,
            abstract=result.abstract,
            doi=result.external_ids.get("DOI"),
            arxiv_id=result.external_ids.get("ArXiv"),
            pdf_url=result.pdf_url,
            citation_count=0,  # Not available in most simple APIs
            is_in_library=False,
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

    async def _attach_library_flags(
        self,
        items: list[SearchResultItem],
        uid: str,
    ) -> list[SearchResultItem]:
        liked_ids = set(await self.paper_repository.get_user_likes(uid))
        return [
            item.model_copy(update={"is_in_library": item.external_id in liked_ids})
            for item in items
        ]

search_service = SearchService()
