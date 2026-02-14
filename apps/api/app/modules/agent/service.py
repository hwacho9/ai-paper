"""D-11: AI Agent - service."""

import re
from typing import Any

from app.core.gemini import gemini_client
from app.modules.agent.schemas import (
    AgentAction,
    AgentChatRequest,
    AgentChatResponse,
    AgentPaper,
    AgentProject,
)
from app.modules.memos.schemas import MemoCreate, MemoRef
from app.modules.memos.service import memo_service
from app.modules.papers.repository import PaperRepository
from app.modules.projects.service import project_service
from app.modules.search.schemas import SearchResultItem
from app.modules.search.service import search_service


class AgentService:
    """Execute multi-step actions from natural language requests."""

    def __init__(self) -> None:
        self.paper_repository = PaperRepository()

    async def handle_chat(self, owner_uid: str, req: AgentChatRequest) -> AgentChatResponse:
        intent = self._parse_intent(req.message)
        if intent["task"] == "create_memos":
            return await self._handle_create_memos(owner_uid, req)
        if intent["task"] == "explain_paper":
            return await self._handle_explain(owner_uid, req, intent)
        return await self._handle_project_and_search(owner_uid, req, intent)

    async def _handle_project_and_search(
        self,
        owner_uid: str,
        req: AgentChatRequest,
        intent: dict[str, Any],
    ) -> AgentChatResponse:
        actions: list[AgentAction] = []
        project: AgentProject | None = None
        papers: list[AgentPaper] = []

        query = intent["query"]
        requested_count = self._extract_requested_count(req.message) or req.attach_top_k
        requested_count = max(1, min(requested_count, 20))
        search_limit = max(req.search_limit, requested_count)

        if intent["should_create_project"]:
            project_data = await project_service.create_project(
                owner_uid,
                {
                    "title": intent["project_title"],
                    "description": f"AI Agent generated from: {req.message[:120]}",
                },
            )
            project = AgentProject(id=project_data["id"], title=project_data["title"])
            actions.append(
                AgentAction(
                    step="create_project",
                    detail=f"プロジェクト「{project.title}」を作成しました。",
                )
            )

        search_response = await search_service.search_papers(
            query=query,
            limit=search_limit,
            offset=0,
            source=req.source,
            uid=owner_uid,
        )
        actions.append(
            AgentAction(
                step="search_papers",
                detail=f"「{query}」で {search_response.total} 件の候補を検索しました。",
            )
        )

        selected = search_response.results[:requested_count]
        existing_ids: set[str] = set()
        if project:
            existing = await project_service.get_project_papers(project.id, owner_uid)
            existing_ids = {p["paper_id"] for p in existing}

        added_count = 0
        for item in selected:
            await self._ensure_paper_exists(item)
            await self.paper_repository.add_like(owner_uid, item.external_id)

            if project and item.external_id not in existing_ids:
                await project_service.add_paper(
                    project.id,
                    item.external_id,
                    owner_uid,
                    note="Added by AI Agent",
                    role="reference",
                )
                added_count += 1
                existing_ids.add(item.external_id)

            papers.append(
                AgentPaper(
                    paper_id=item.external_id,
                    title=item.title,
                    authors=item.authors,
                    year=item.year,
                    venue=item.venue,
                )
            )

        if project:
            actions.append(
                AgentAction(
                    step="link_papers_to_project",
                    detail=f"{added_count} 件の論文をプロジェクトへ追加しました。",
                )
            )
        else:
            actions.append(
                AgentAction(
                    step="save_papers_to_library",
                    detail=f"{len(papers)} 件の論文をライブラリに保存しました。",
                )
            )

        reply = self._compose_reply(project, query, papers)
        return AgentChatResponse(
            reply=self._to_plain_text(reply),
            actions=actions,
            project=project,
            papers=papers,
        )

    async def _handle_explain(
        self,
        owner_uid: str,
        req: AgentChatRequest,
        intent: dict[str, Any],
    ) -> AgentChatResponse:
        actions: list[AgentAction] = []

        query = intent["query"]
        search_response = await search_service.search_papers(
            query=query,
            limit=3,
            offset=0,
            source=req.source,
            uid=owner_uid,
        )
        actions.append(
            AgentAction(
                step="search_papers",
                detail=f"説明対象として「{query}」を検索しました。",
            )
        )

        if not search_response.results:
            return AgentChatResponse(
                reply=self._to_plain_text("対象論文が見つかりませんでした。タイトルをもう少し正確に指定してください。"),
                actions=actions,
            )

        target = search_response.results[0]
        await self._ensure_paper_exists(target)
        await self.paper_repository.add_like(owner_uid, target.external_id)
        actions.append(
            AgentAction(
                step="save_paper_to_library",
                detail=f"対象論文「{target.title}」をライブラリに保存しました。",
            )
        )

        llm_text = await gemini_client.explain_paper(
            title=target.title,
            abstract=target.abstract or "",
            question=req.message,
        )
        if llm_text:
            reply = (
                f"対象論文: {target.title}\n"
                f"著者: {', '.join(target.authors[:5]) if target.authors else '不明'}\n"
                f"年: {target.year if target.year else '不明'}\n\n"
                f"{llm_text}"
            )
        else:
            reply = self._compose_fallback_explanation(target)

        paper = AgentPaper(
            paper_id=target.external_id,
            title=target.title,
            authors=target.authors,
            year=target.year,
            venue=target.venue,
        )
        return AgentChatResponse(
            reply=self._to_plain_text(reply),
            actions=actions,
            papers=[paper],
        )

    async def _handle_create_memos(
        self,
        owner_uid: str,
        req: AgentChatRequest,
    ) -> AgentChatResponse:
        actions: list[AgentAction] = []
        paper_docs = await self._resolve_context_papers(owner_uid, req)
        if not paper_docs:
            return AgentChatResponse(
                reply=self._to_plain_text(
                    "メモ対象の論文コンテキストが見つかりませんでした。"
                    "先に論文収集を実行するか、対象論文名を明示してください。"
                ),
                actions=actions,
            )

        created = 0
        for idx, paper in enumerate(paper_docs, start=1):
            title = paper.get("title") or f"Paper {idx}"
            paper_id = paper.get("id") or ""
            if not paper_id:
                continue

            refs = [MemoRef(ref_type="paper", ref_id=paper_id, note=None)]
            if req.context_project_id:
                refs.append(
                    MemoRef(
                        ref_type="project",
                        ref_id=req.context_project_id,
                        note="Created by AI Agent memo workflow",
                    )
                )

            await memo_service.create_memo(
                owner_uid,
                MemoCreate(
                    title=f"Summary: {title}",
                    body=self._build_summary_memo_body(paper, idx),
                    tags=["agent-summary", "reading-order"],
                    refs=refs,
                    status="draft",
                ),
            )
            created += 1

        actions.append(
            AgentAction(
                step="create_memos",
                detail=f"{created} 件の要点メモを作成しました。",
            )
        )
        reply = (
            f"{created} 件の要点メモを作成しました。\n"
            "メモ一覧で `agent-summary` タグを検索するとまとめて確認できます。"
        )
        papers = [
            AgentPaper(
                paper_id=p.get("id", ""),
                title=p.get("title", ""),
                authors=p.get("authors", []) or [],
                year=p.get("year"),
                venue=p.get("venue", "") or "",
            )
            for p in paper_docs
            if p.get("id")
        ]
        return AgentChatResponse(
            reply=self._to_plain_text(reply),
            actions=actions,
            papers=papers,
        )

    async def _resolve_context_papers(
        self,
        owner_uid: str,
        req: AgentChatRequest,
    ) -> list[dict[str, Any]]:
        papers: list[dict[str, Any]] = []

        if req.context_papers:
            for ctx in req.context_papers:
                stored = await self.paper_repository.get_by_id(ctx.paper_id)
                if stored:
                    papers.append(stored)
                    continue
                papers.append(
                    {
                        "id": ctx.paper_id,
                        "title": ctx.title,
                        "authors": ctx.authors,
                        "year": ctx.year,
                        "venue": ctx.venue,
                        "abstract": "",
                    }
                )
            return papers

        if req.context_project_id:
            project_papers = await project_service.get_project_papers(
                req.context_project_id,
                owner_uid,
            )
            for p in project_papers:
                paper_id = p.get("paper_id")
                if not paper_id:
                    continue
                stored = await self.paper_repository.get_by_id(paper_id)
                if stored:
                    papers.append(stored)
            return papers

        return papers

    async def _ensure_paper_exists(self, item: SearchResultItem) -> None:
        exists = await self.paper_repository.get_by_id(item.external_id)
        if exists:
            return
        await self.paper_repository.create(
            item.external_id,
            {
                "title": item.title,
                "authors": item.authors,
                "year": item.year,
                "venue": item.venue,
                "abstract": item.abstract,
                "doi": item.doi,
                "arxiv_id": item.arxiv_id,
                "pdf_url": item.pdf_url,
                "keywords": [],
                "prerequisite_keywords": [],
            },
        )

    def _parse_intent(self, message: str) -> dict[str, Any]:
        text = message.strip()
        project_title = self._extract_project_title(text)
        explain_query = self._extract_explain_query(text)
        should_explain = explain_query is not None and self._is_explain_request(text)
        should_memo = self._is_memo_request(text)

        should_create_project = bool(
            project_title
            or (
                ("プロジェクト" in text or "project" in text.lower())
                and any(k in text for k in ["作成", "新規", "作って", "create"])
            )
        )
        if not project_title and should_create_project:
            project_title = "AI Agent Project"

        query = explain_query if should_explain else self._extract_query(text, project_title)
        task = "create_memos" if should_memo else ("explain_paper" if should_explain else "search_and_organize")
        return {
            "task": task,
            "should_create_project": should_create_project and not should_explain and not should_memo,
            "project_title": project_title,
            "query": query,
        }

    def _is_explain_request(self, text: str) -> bool:
        return (
            "論文" in text
            and any(k in text for k in ["内容", "要約", "教えて", "解説", "説明"])
        )

    def _is_memo_request(self, text: str) -> bool:
        return any(
            key in text
            for key in [
                "要点メモ",
                "メモを作",
                "まとめメモ",
                "この順番で",
            ]
        )

    def _extract_explain_query(self, text: str) -> str | None:
        m = re.search(r"[「\"](?P<name>[^\"」]{1,200})[」\"]の?論文", text)
        if m:
            return m.group("name").strip()
        m = re.search(r"(?P<name>.+?)の論文の(?:内容|要約|解説|説明)", text)
        if m:
            return m.group("name").strip(" 。、")
        return None

    def _extract_project_title(self, text: str) -> str | None:
        patterns = [
            r"プロジェクト(?:名)?(?:を|は)?[「\"](?P<name>[^\"」]{1,80})[」\"]",
            r"[「\"](?P<name>[^\"」]{1,80})[」\"](?:という名前)?でプロジェクト",
            r"project named (?P<name>[A-Za-z0-9 _-]{1,80})",
        ]
        for pattern in patterns:
            m = re.search(pattern, text, flags=re.IGNORECASE)
            if m:
                return m.group("name").strip()
        return None

    def _extract_requested_count(self, text: str) -> int | None:
        m = re.search(r"(\d{1,2})\s*(本|件|papers?)", text, flags=re.IGNORECASE)
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                return None
        return None

    def _extract_query(self, text: str, project_title: str | None) -> str:
        m = re.search(r"(.+?)に関連する論文", text)
        if m:
            candidate = m.group(1).strip(" 。、")
            if candidate:
                return candidate
        if project_title:
            return project_title
        return text[:200]

    def _compose_reply(
        self,
        project: AgentProject | None,
        query: str,
        papers: list[AgentPaper],
    ) -> str:
        sorted_papers = sorted(
            papers,
            key=lambda p: (p.year is None, p.year if p.year is not None else 9999),
        )

        lines: list[str] = []
        if project:
            lines.append(f"プロジェクト「{project.title}」を作成し、関連論文を登録しました。")
        else:
            lines.append("関連論文を検索してライブラリに保存しました。")
        lines.append(f"検索クエリ: {query}")
        lines.append("")
        lines.append("推奨読書順:")
        for idx, paper in enumerate(sorted_papers, start=1):
            year = str(paper.year) if paper.year is not None else "年不明"
            venue = paper.venue or "venue不明"
            lines.append(f"{idx}. {paper.title} ({year}, {venue})")
        lines.append("")
        lines.append("必要なら次は「この順番で各論文の要点メモを作って」と依頼してください。")
        return "\n".join(lines)

    def _compose_fallback_explanation(self, target: SearchResultItem) -> str:
        abstract = (target.abstract or "").strip()
        if not abstract:
            return (
                f"対象論文: {target.title}\n"
                f"著者: {', '.join(target.authors[:5]) if target.authors else '不明'}\n"
                f"年: {target.year if target.year else '不明'}\n\n"
                "この論文は見つかりましたが、要約に必要なAbstractが取得できませんでした。"
            )

        short_abs = abstract[:1200]
        return (
            f"対象論文: {target.title}\n"
            f"著者: {', '.join(target.authors[:5]) if target.authors else '不明'}\n"
            f"年: {target.year if target.year else '不明'}\n\n"
            "概要:\n"
            f"{short_abs}\n\n"
            "補足: 現在はAbstractベースの説明です。必要なら「この論文の貢献点だけ3つで」など具体化してください。"
        )

    def _build_summary_memo_body(self, paper: dict[str, Any], order: int) -> str:
        title = paper.get("title") or "Untitled"
        authors = paper.get("authors") or []
        year = paper.get("year") or "不明"
        venue = paper.get("venue") or "不明"
        abstract = (paper.get("abstract") or "").strip()
        abstract_snippet = abstract[:1400] if abstract else "(Abstract未取得)"
        return (
            f"## 読書順\n{order}\n\n"
            f"## 論文\n- タイトル: {title}\n"
            f"- 著者: {', '.join(authors) if authors else '不明'}\n"
            f"- 年: {year}\n"
            f"- Venue: {venue}\n\n"
            "## 要点\n"
            "- 主張:\n"
            "- 手法:\n"
            "- 結果:\n\n"
            "## Abstract（取得分）\n"
            f"{abstract_snippet}\n\n"
            "## 次に確認すること\n"
            "- 関連研究との差分\n"
            "- 再現に必要な前提\n"
        )

    def _to_plain_text(self, text: str) -> str:
        """
        Chat表示向けに簡易プレーンテキスト化する。
        Markdown記法の代表パターンを除去する。
        """
        cleaned = text or ""
        cleaned = re.sub(r"^\s{0,3}#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
        cleaned = re.sub(r"\*(.*?)\*", r"\1", cleaned)
        cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)
        cleaned = re.sub(r"^\s*[-*]\s+", "・", cleaned, flags=re.MULTILINE)
        return cleaned.strip()


agent_service = AgentService()
