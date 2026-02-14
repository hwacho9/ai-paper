import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote

from app.core.gemini import gemini_client
from app.modules.agent.schemas import (
    AgentAction,
    AgentChatRequest,
    AgentChatResponse,
    AgentPlan,
    AgentStepResult,
)
from app.modules.memos.schemas import MemoCreate, MemoRef
from app.modules.memos.service import memo_service
from app.modules.papers.schemas import PaperCreate
from app.modules.papers.service import paper_service
from app.modules.projects.service import project_service
from app.modules.reading.schemas import LibraryAskRequest
from app.modules.reading.service import reading_service
from app.modules.search.service import search_service


class AgentService:
    def __init__(self) -> None:
        self.function_doc = self._load_function_doc()
        self.allowed_actions = {
            "search_papers",
            "like_paper_from_last_search",
            "create_project",
            "add_paper_to_project",
            "add_last_liked_paper_to_project",
            "list_library",
            "ask_library",
            "create_memo_for_last_paper",
            "suggest_keywords_for_last_paper",
            "get_related_for_last_paper",
            "compile_project_tex",
        }

    def _load_function_doc(self) -> str:
        current = Path(__file__).resolve()
        for base in [current.parent, *current.parents]:
            path = base / "docs" / "function.md"
            if path.exists():
                return path.read_text(encoding="utf-8")
        return ""

    async def chat(self, uid: str, req: AgentChatRequest) -> AgentChatResponse:
        if req.actions_override:
            override_actions = req.actions_override[:60]
            plan = AgentPlan(
                summary="Client-provided plan",
                plan=[self._action_to_todo(a) for a in override_actions],
                actions=override_actions,
            )
        else:
            plan = await self._make_plan(req)
        steps: list[AgentStepResult] = []
        state: dict[str, Any] = {
            "last_search_results": [],
            "last_liked_paper_id": req.context.paper_id,
            "last_liked_paper_item": None,
            "last_project_id": req.context.project_id,
            "artifacts": {},
        }

        if req.execute:
            for action in plan.actions:
                result = await self._execute_action(uid, action, state)
                steps.append(result)
                if result.status == "completed":
                    continue

                retry = await self._execute_alternative(uid, action, state, result)
                if retry:
                    steps.append(retry)
                    if retry.status == "completed":
                        continue

                steps.append(
                    AgentStepResult(
                        action=action.action,
                        status="skipped",
                        detail="Execution halted after retry failure",
                        error="stop_on_failure",
                    )
                )
                break

        verification = await self._verify_outcome(req, plan, steps, state)
        state["artifacts"]["verification"] = verification
        target_path = self._decide_target_path(req, plan, steps, state)
        if target_path:
            state["artifacts"]["target_path"] = target_path
        reply = self._build_reply(plan, steps, req.execute, verification)
        return AgentChatResponse(
            reply=reply,
            plan=plan.plan,
            actions=plan.actions,
            steps=steps,
            artifacts=state["artifacts"],
            target_path=target_path,
        )

    async def _make_plan(self, req: AgentChatRequest) -> AgentPlan:
        llm_plan = await self._plan_with_llm(req)
        if llm_plan:
            return llm_plan
        return self._plan_with_rules(req.message)

    async def _plan_with_llm(self, req: AgentChatRequest) -> AgentPlan | None:
        model = getattr(gemini_client, "model", None)
        if not model:
            return None

        history_text = "\n".join(
            [f"{m.role}: {m.content}" for m in req.history[-8:]]
        )
        prompt = f"""
あなたは論文IDEの実行プランナーです。
必ず以下の許可アクションだけを使ってください。
出力は日本語で返してください。

Allowed actions:
- search_papers(params: query, source?, limit?)
- like_paper_from_last_search(params: index?)
- create_project(params: title, description?)
- add_paper_to_project(params: project_id, paper_id)
- add_last_liked_paper_to_project(params: project_id?)
- list_library(params: none)
- ask_library(params: question, top_k?)
- create_memo_for_last_paper(params: title?, body)
- suggest_keywords_for_last_paper(params: none)
- get_related_for_last_paper(params: limit?)
- compile_project_tex(params: project_id?, main_file?)

能力定義は docs/function.md を参照:
{self.function_doc[:12000]}

会話履歴:
{history_text}

ユーザー要求:
{req.message}

JSONのみで返却:
{{
  "summary": "要約",
  "plan": ["手順1", "手順2"],
  "actions": [
    {{"action":"search_papers","params":{{"query":"..."}}}}
  ]
}}
"""
        try:
            resp = await model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"},
            )
            payload = self._parse_json(resp.text)
            if not payload:
                return None

            actions_raw = payload.get("actions") or []
            actions: list[AgentAction] = []
            for item in actions_raw:
                action_name = str((item or {}).get("action", "")).strip()
                if action_name not in self.allowed_actions:
                    continue
                params = (item or {}).get("params") or {}
                if not isinstance(params, dict):
                    params = {}
                actions.append(AgentAction(action=action_name, params=params))

            if not actions:
                return None

            return AgentPlan(
                summary=str(payload.get("summary", "実行プラン")),
                plan=[str(p) for p in (payload.get("plan") or [])][:8],
                actions=actions[:40],
            )
        except Exception:
            return None

    async def _verify_outcome(
        self,
        req: AgentChatRequest,
        plan: AgentPlan,
        steps: list[AgentStepResult],
        state: dict[str, Any],
    ) -> dict[str, Any]:
        if not req.execute:
            return {
                "verdict": "not_executed",
                "summary": "未実行のため検証していません。",
                "achieved": [],
                "missing": [],
            }

        model = getattr(gemini_client, "model", None)
        if model:
            try:
                prompt = f"""
あなたは論文IDEエージェントの監査者です。以下の「ユーザー要求」に対して、
「実行結果」が要求を満たしているか厳密に判定してください。

判定基準:
- verdict は "met" | "partial" | "not_met" のいずれか
- achieved: 実現できたこと（短い箇条書き）
- missing: 未達・不足していること（短い箇条書き）
- summary: 全体評価（日本語）

ユーザー要求:
{req.message}

計画:
{json.dumps(plan.plan, ensure_ascii=False)}

実行ステップ:
{json.dumps([s.model_dump() for s in steps], ensure_ascii=False)}

成果物:
{json.dumps(state.get("artifacts", {}), ensure_ascii=False)}

JSONのみで返却:
{{
  "verdict": "partial",
  "summary": "要約",
  "achieved": ["..."],
  "missing": ["..."]
}}
"""
                resp = await model.generate_content_async(
                    prompt,
                    generation_config={"response_mime_type": "application/json"},
                )
                parsed = self._parse_json(resp.text) or {}
                verdict = str(parsed.get("verdict", "partial"))
                if verdict not in {"met", "partial", "not_met"}:
                    verdict = "partial"
                achieved = [str(x) for x in (parsed.get("achieved") or [])][:10]
                missing = [str(x) for x in (parsed.get("missing") or [])][:10]
                summary = str(parsed.get("summary", "検証結果を生成しました。"))
                return {
                    "verdict": verdict,
                    "summary": summary,
                    "achieved": achieved,
                    "missing": missing,
                }
            except Exception:
                pass

        # Fallback heuristic verification
        completed = [s for s in steps if s.status == "completed"]
        failed = [s for s in steps if s.status == "failed"]
        achieved: list[str] = []
        missing: list[str] = []
        if any(s.action == "create_project" for s in completed):
            achieved.append("プロジェクト作成は完了しました。")
        if any(s.action in {"add_paper_to_project", "add_last_liked_paper_to_project"} for s in completed):
            achieved.append("プロジェクトへの論文追加は一部完了しました。")
        if any(s.action == "create_memo_for_last_paper" for s in completed):
            achieved.append("論文メモの作成は一部完了しました。")
        if failed:
            missing.append(f"{len(failed)} 件のステップが失敗しています。")
        if not achieved:
            missing.append("要求に対して有効な完了ステップが確認できませんでした。")
        verdict = "met"
        if failed and achieved:
            verdict = "partial"
        if failed and not achieved:
            verdict = "not_met"
        if not failed and not achieved:
            verdict = "not_met"
        summary = (
            "要件を満たしました。"
            if verdict == "met"
            else "一部は実現しましたが未達項目があります。"
            if verdict == "partial"
            else "要件を満たせませんでした。"
        )
        return {
            "verdict": verdict,
            "summary": summary,
            "achieved": achieved,
            "missing": missing,
        }

    def _plan_with_rules(self, text: str) -> AgentPlan:
        lower = text.lower()
        query = self._extract_query(text)
        actions: list[AgentAction] = []
        plan: list[str] = []

        needs_search = any(k in text for k in ["検索", "探", "search", "find"])
        needs_save = any(k in text for k in ["保存", "like", "追加して", "ライブラリ"])
        needs_project = "プロジェクト" in text or "project" in lower
        needs_ask = any(k in text for k in ["質問", "教えて", "ask", "要約", "explain"])

        if needs_search:
            actions.append(
                AgentAction(
                    action="search_papers",
                    params={"query": query, "limit": 8, "source": "auto"},
                )
            )
            plan.append("論文検索を実行")

        if needs_save:
            actions.append(
                AgentAction(action="like_paper_from_last_search", params={"index": 0})
            )
            plan.append("上位論文をライブラリに保存")

        if needs_project and ("作成" in text or "create" in lower or "新規" in text):
            title = self._extract_project_title(text, query)
            actions.append(
                AgentAction(
                    action="create_project",
                    params={"title": title, "description": f"Auto-created for: {query}"},
                )
            )
            plan.append("プロジェクトを作成")
            if needs_save:
                actions.append(
                    AgentAction(
                        action="add_last_liked_paper_to_project",
                        params={},
                    )
                )
                plan.append("保存済み論文をプロジェクトに追加")

        if needs_ask:
            actions.append(
                AgentAction(
                    action="ask_library",
                    params={"question": text, "top_k": 5},
                )
            )
            plan.append("ライブラリQ&Aを実行")

        if not actions:
            actions.append(
                AgentAction(
                    action="ask_library",
                    params={"question": text, "top_k": 5},
                )
            )
            plan.append("ライブラリQ&Aを既定実行")

        return AgentPlan(
            summary="ルールベース実行プラン",
            plan=plan,
            actions=actions,
        )

    async def _execute_action(
        self,
        uid: str,
        action: AgentAction,
        state: dict[str, Any],
    ) -> AgentStepResult:
        try:
            if action.action == "search_papers":
                query = str(action.params.get("query", "")).strip()
                if not query:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="クエリが不足しています",
                        error="query is required",
                    )
                source = str(action.params.get("source", "auto"))
                limit = int(action.params.get("limit", 8))
                result = await search_service.search_papers(
                    query=query,
                    source=source,
                    limit=max(1, min(limit, 20)),
                    uid=uid,
                )
                state["last_search_results"] = result.results
                top_titles = [r.title for r in result.results[:3]]
                state["artifacts"]["last_search"] = {
                    "query": query,
                    "count": result.total,
                    "top_titles": top_titles,
                }
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail=f"{result.total} 件の論文を取得",
                    output={"total": result.total, "top_titles": top_titles},
                )

            if action.action == "like_paper_from_last_search":
                results = state.get("last_search_results") or []
                if not results:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="直前の検索結果がありません",
                        error="search_papers must run first",
                    )
                idx = int(action.params.get("index", 0))
                if idx < 0 or idx >= len(results):
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="検索結果インデックスが不正です",
                        error="index out of range",
                    )
                item = results[idx]
                if getattr(item, "is_in_library", False):
                    state["last_liked_paper_id"] = item.external_id
                    state["last_liked_paper_item"] = item
                    return AgentStepResult(
                        action=action.action,
                        status="completed",
                        detail=f"既にライブラリ登録済み: {item.title}",
                        output={"paper_id": item.external_id, "liked": True},
                    )
                liked = await paper_service.toggle_like(
                    uid,
                    PaperCreate(
                        external_id=item.external_id,
                        source=item.source,
                        title=item.title,
                        authors=item.authors,
                        year=item.year,
                        venue=item.venue,
                        abstract=item.abstract,
                        doi=item.doi,
                        arxiv_id=item.arxiv_id,
                        pdf_url=item.pdf_url,
                    ),
                )
                if liked:
                    state["last_liked_paper_id"] = item.external_id
                    state["last_liked_paper_item"] = item
                state["artifacts"]["last_liked_paper_id"] = state.get("last_liked_paper_id")
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail=("ライブラリ保存: " if liked else "保存解除: ") + f"{item.title}",
                    output={"paper_id": item.external_id, "liked": liked},
                )

            if action.action == "create_project":
                title = str(action.params.get("title", "")).strip()
                if not title:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="プロジェクトタイトルが不足しています",
                        error="title is required",
                    )
                description = str(action.params.get("description", "")).strip()
                project = await project_service.create_project(
                    owner_uid=uid,
                    data={"title": title, "description": description},
                )
                state["last_project_id"] = project["id"]
                state["artifacts"]["last_project"] = {
                    "id": project["id"],
                    "title": project["title"],
                }
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail=f"プロジェクト作成: {project['title']}",
                    output={"project_id": project["id"], "title": project["title"]},
                )

            if action.action == "add_paper_to_project":
                project_id = str(action.params.get("project_id", "")).strip()
                paper_id = str(action.params.get("paper_id", "")).strip()
                if not project_id or not paper_id:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="project_id または paper_id が不足しています",
                        error="project_id and paper_id are required",
                    )
                added = await project_service.add_paper(
                    project_id=project_id,
                    paper_id=paper_id,
                    owner_uid=uid,
                )
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail="プロジェクトへ論文を追加",
                    output={"project_id": project_id, "paper_id": added.get("paper_id", paper_id)},
                )

            if action.action == "add_last_liked_paper_to_project":
                project_id = state.get("last_project_id") or str(
                    action.params.get("project_id", "")
                ).strip()
                paper_id = state.get("last_liked_paper_id")
                if not project_id or not paper_id:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="対象プロジェクトまたは論文が不足しています",
                        error="create_project and like action are required before this",
                    )
                await project_service.add_paper(
                    project_id=project_id,
                    paper_id=paper_id,
                    owner_uid=uid,
                )
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail="直近保存論文をプロジェクトへ追加",
                    output={"project_id": project_id, "paper_id": paper_id},
                )

            if action.action == "list_library":
                library = await paper_service.get_user_library(uid)
                items = [{"id": p.id, "title": p.title} for p in library.papers[:10]]
                state["artifacts"]["library"] = {"count": library.total, "items": items}
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail=f"ライブラリ {library.total} 件を取得",
                    output={"count": library.total, "items": items},
                )

            if action.action == "ask_library":
                question = str(action.params.get("question", "")).strip()
                if not question:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="質問文が不足しています",
                        error="question is required",
                    )
                top_k = int(action.params.get("top_k", 5))
                answer = await reading_service.ask_library(
                    uid,
                    LibraryAskRequest(question=question, top_k=max(1, min(top_k, 20))),
                )
                state["artifacts"]["ask_library"] = {
                    "answer": answer.answer,
                    "confidence": answer.confidence,
                    "citations": [c.model_dump() for c in answer.citations],
                }
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail="ライブラリQ&Aを実行",
                    output={
                        "answer": answer.answer,
                        "confidence": answer.confidence,
                        "citations": len(answer.citations),
                    },
                )

            if action.action == "create_memo_for_last_paper":
                paper_id = state.get("last_liked_paper_id")
                if not paper_id:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="対象論文がありません",
                        error="like a paper first",
                    )
                title = str(action.params.get("title", "")).strip() or f"Paper: {paper_id}"
                body = str(action.params.get("body", "")).strip()
                if (not body) or self._is_placeholder_text(body):
                    body = self._default_memo_body_from_last_paper(state)
                memo = await memo_service.create_memo(
                    uid,
                    MemoCreate(
                        title=title,
                        body=body,
                        refs=[MemoRef(ref_type="paper", ref_id=paper_id)],
                    ),
                )
                state["artifacts"]["last_memo_id"] = memo.id
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail="要約メモを作成",
                    output={"memo_id": memo.id, "paper_id": paper_id},
                )

            if action.action == "suggest_keywords_for_last_paper":
                paper_id = state.get("last_liked_paper_id")
                if not paper_id:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="対象論文がありません",
                        error="like a paper first",
                    )
                from app.modules.keywords.service import keyword_service

                result = await keyword_service.suggest_and_apply(paper_id, uid)
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail=f"キーワード推薦を {result.total} 件適用",
                    output={"paper_id": paper_id, "count": result.total},
                )

            if action.action == "get_related_for_last_paper":
                paper_id = state.get("last_liked_paper_id")
                if not paper_id:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="対象論文がありません",
                        error="like a paper first",
                    )
                from app.modules.related.service import related_service

                limit = int(action.params.get("limit", 5))
                related = await related_service.get_related_papers(paper_id, limit=limit)
                titles = [p.title for p in related[:5]]
                state["artifacts"]["related"] = {"paper_id": paper_id, "titles": titles}
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail=f"関連論文を {len(related)} 件取得",
                    output={"count": len(related), "titles": titles},
                )

            if action.action == "compile_project_tex":
                project_id = str(action.params.get("project_id", "")).strip() or state.get(
                    "last_project_id"
                )
                if not project_id:
                    return AgentStepResult(
                        action=action.action,
                        status="failed",
                        detail="対象プロジェクトがありません",
                        error="project_id is required",
                    )
                main_file = str(action.params.get("main_file", "main.tex"))
                compile_result = await project_service.compile_tex(project_id, uid, main_file)
                state["artifacts"]["tex_compile"] = compile_result
                return AgentStepResult(
                    action=action.action,
                    status="completed",
                    detail="LaTeXをコンパイル",
                    output={
                        "project_id": project_id,
                        "pdf_path": compile_result.get("pdf_path"),
                        "pdf_url": compile_result.get("pdf_url"),
                    },
                )

            return AgentStepResult(
                action=action.action,
                status="skipped",
                detail="未対応アクション",
                error="unsupported action",
            )
        except Exception as exc:
            return AgentStepResult(
                action=action.action,
                status="failed",
                detail="アクション実行失敗",
                error=str(exc),
            )

    async def _execute_alternative(
        self,
        uid: str,
        action: AgentAction,
        state: dict[str, Any],
        failed_result: AgentStepResult,
    ) -> AgentStepResult | None:
        if action.action == "add_last_liked_paper_to_project":
            alt_project_id = state.get("last_project_id")
            alt_paper_id = state.get("last_liked_paper_id")
            if not alt_project_id or not alt_paper_id:
                return None
            alt = AgentAction(
                action="add_paper_to_project",
                params={"project_id": alt_project_id, "paper_id": alt_paper_id},
            )
            retried = await self._execute_action(uid, alt, state)
            retried.detail = f"[retry] {retried.detail}"
            if retried.status != "completed":
                retried.error = retried.error or failed_result.error
            return retried

        if action.action == "like_paper_from_last_search":
            idx = int(action.params.get("index", 0))
            alt = AgentAction(
                action="like_paper_from_last_search",
                params={"index": idx + 1},
            )
            retried = await self._execute_action(uid, alt, state)
            retried.detail = f"[retry] {retried.detail}"
            if retried.status != "completed":
                retried.error = retried.error or failed_result.error
            return retried

        return None

    def _default_memo_body_from_last_paper(self, state: dict[str, Any]) -> str:
        item = state.get("last_liked_paper_item")
        if not item:
            return "要約:\nこの論文の要約は取得できませんでした。本文を確認して追記してください。"
        title = getattr(item, "title", "") or "Unknown title"
        authors = getattr(item, "authors", []) or []
        year = getattr(item, "year", None)
        abstract = (getattr(item, "abstract", "") or "").strip()
        abstract_line = abstract if abstract else "Abstract is not available."
        if len(abstract_line) > 900:
            abstract_line = abstract_line[:900].rstrip() + "..."
        author_text = ", ".join(authors[:5]) if authors else "Unknown authors"
        year_text = str(year) if year else "N/A"
        return (
            f"タイトル: {title}\n"
            f"著者: {author_text}\n"
            f"年: {year_text}\n\n"
            "要約（Abstractベース）:\n"
            f"{abstract_line}\n\n"
            "メモ:\n- "
        )

    def _is_placeholder_text(self, body: str) -> bool:
        normalized = body.strip().lower()
        placeholders = [
            "please add a summary",
            "todo",
            "tbd",
            "add summary",
            "placeholder",
        ]
        return any(p in normalized for p in placeholders)

    def _action_to_todo(self, action: AgentAction) -> str:
        mapping = {
            "search_papers": "論文を検索",
            "like_paper_from_last_search": "論文をライブラリに保存",
            "create_project": "プロジェクトを作成",
            "add_paper_to_project": "論文をプロジェクトに追加",
            "add_last_liked_paper_to_project": "直近保存論文をプロジェクトに追加",
            "list_library": "ライブラリを取得",
            "ask_library": "ライブラリQ&Aを実行",
            "create_memo_for_last_paper": "論文要約メモを作成",
            "suggest_keywords_for_last_paper": "キーワード推薦を実行",
            "get_related_for_last_paper": "関連論文を取得",
            "compile_project_tex": "LaTeXをコンパイル",
        }
        return mapping.get(action.action, action.action)

    def _extract_query(self, text: str) -> str:
        cleaned = text
        for token in ["検索", "探して", "探す", "search", "find", "please", "して", "ください"]:
            cleaned = cleaned.replace(token, " ")
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned or text.strip()

    def _extract_project_title(self, text: str, fallback: str) -> str:
        m = re.search(r"[\"'「](.+?)[\"'」]", text)
        if m:
            return m.group(1).strip()[:80]
        return f"{fallback[:60]} project"

    def _parse_json(self, raw: str | None) -> dict[str, Any] | None:
        if not raw:
            return None
        text = raw.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?", "", text)
            text = re.sub(r"```$", "", text).strip()
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return data
            return None
        except Exception:
            return None

    def _build_reply(
        self,
        plan: AgentPlan,
        steps: list[AgentStepResult],
        executed: bool,
        verification: dict[str, Any] | None = None,
    ) -> str:
        if not executed:
            return f"計画を作成しました。{plan.summary}"

        completed = [s for s in steps if s.status == "completed"]
        failed = [s for s in steps if s.status == "failed"]
        halted = any(
            s.status == "skipped" and "Execution halted" in (s.detail or "")
            for s in steps
        )
        parts = [f"{len(completed)} ステップ完了。"]
        if failed:
            parts.append(f"{len(failed)} ステップ失敗。")
        if halted:
            parts.append("再試行失敗のため中断しました。")
        if completed:
            parts.append("完了アクション: " + ", ".join([s.action for s in completed[:4]]))
        if verification:
            parts.append(f"検証: {verification.get('summary', '')}")
            achieved = verification.get("achieved") or []
            missing = verification.get("missing") or []
            if achieved:
                parts.append("できたこと: " + " / ".join([str(x) for x in achieved[:4]]))
            if missing:
                parts.append("未達: " + " / ".join([str(x) for x in missing[:4]]))
        return " ".join(parts)

    def _decide_target_path(
        self,
        req: AgentChatRequest,
        plan: AgentPlan,
        steps: list[AgentStepResult],
        state: dict[str, Any],
    ) -> str | None:
        if not req.execute:
            return None

        completed_actions = [s.action for s in steps if s.status == "completed"]
        completed_set = set(completed_actions)

        project_id = state.get("last_project_id")
        paper_id = state.get("last_liked_paper_id")
        if project_id:
            project_id = quote(str(project_id), safe="")
        if paper_id:
            paper_id = quote(str(paper_id), safe="")

        if "compile_project_tex" in completed_set and project_id:
            return f"/projects/{project_id}"

        if (
            project_id
            and (
                "add_paper_to_project" in completed_set
                or "add_last_liked_paper_to_project" in completed_set
                or "create_project" in completed_set
            )
        ):
            return f"/projects/{project_id}"

        if paper_id and (
            "create_memo_for_last_paper" in completed_set
            or "suggest_keywords_for_last_paper" in completed_set
            or "get_related_for_last_paper" in completed_set
        ):
            return f"/papers/{paper_id}"

        if "ask_library" in completed_set:
            return "/library"

        if "search_papers" in completed_set:
            return "/search"

        return None


agent_service = AgentService()
