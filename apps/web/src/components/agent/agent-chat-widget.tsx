"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  AgentAction,
  AgentChatResponse,
  AgentMessage,
  AgentStepResult,
  runAgentChat,
} from "@/lib/api/agent";

type UiMessage = AgentMessage & {
  id: string;
  meta?: {
    plan?: string[];
    steps?: AgentStepResult[];
    verification?: {
      verdict: "met" | "partial" | "not_met" | "not_executed";
      summary: string;
      achieved: string[];
      missing: string[];
    } | null;
  };
};

function inferContext(pathname: string): { project_id?: string; paper_id?: string } {
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  if (projectMatch) return { project_id: projectMatch[1] };
  const paperMatch = pathname.match(/^\/papers\/([^/]+)/);
  if (paperMatch) return { paper_id: paperMatch[1] };
  return {};
}

function summarizeSteps(steps: AgentStepResult[]): string {
  if (!steps.length) return "実行ステップはありません。";
  const ok = steps.filter((s) => s.status === "completed").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  return `完了 ${ok} / 失敗 ${failed}`;
}

export function AgentChatWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "planning" | "executing">("idle");
  const [livePlan, setLivePlan] = useState<string[]>([]);
  const [liveActions, setLiveActions] = useState<AgentAction[]>([]);
  const [liveStepIndex, setLiveStepIndex] = useState(0);
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([]);
  const [pendingPlan, setPendingPlan] = useState<string[]>([]);
  const [pendingByVerdict, setPendingByVerdict] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "init-assistant",
      role: "assistant",
      content:
        "論文IDEエージェントです。論文検索、ライブラリ保存、プロジェクト作成、論文追加、要約メモ作成、LaTeXコンパイルまで実行できます。",
    },
  ]);

  const context = useMemo(() => inferContext(pathname), [pathname]);
  const promptTemplates = useMemo(
    () => [
      {
        label: "何でも検索してください",
        prompt:
          "画像認識の最新の研究を検索して、注目論文を3本ライブラリに保存してください。",
      },
      {
        label: "サーベイプロジェクトを作成する",
        prompt:
          "LLMに関するサーベイ用のプロジェクトを新規作成して、関連研究を3本入れてください。",
      },
      {
        label: "現在の論文の分析",
        prompt:
          "現在の論文に対して要点を抽出し、メモにまとめてください。",
      },
      {
        label: "タスクトラッカーを作成する",
        prompt:
          "現在のプロジェクトで次にやるべきタスクを5件、優先度付きでメモ化してください。",
      },
    ],
    [],
  );

  const resetConversation = () => {
    setMessages([
      {
        id: "init-assistant",
        role: "assistant",
        content:
          "論文IDEエージェントです。論文検索、ライブラリ保存、プロジェクト作成、論文追加、要約メモ作成、LaTeXコンパイルまで実行できます。",
      },
    ]);
    setInput("");
    setPhase("idle");
    setLivePlan([]);
    setLiveActions([]);
    setLiveStepIndex(0);
    setPendingActions([]);
    setPendingPlan([]);
    setPendingByVerdict(false);
  };

  const executePendingTasks = async () => {
    if (loading || pendingActions.length === 0) return;
    setLoading(true);
    setPhase("executing");
    setLiveActions(pendingActions);
    setLivePlan(pendingPlan.length ? pendingPlan : pendingActions.map((a) => a.action));
    setLiveStepIndex(0);
    let ticker: ReturnType<typeof setInterval> | null = null;

    try {
      ticker = setInterval(() => {
        setLiveStepIndex((prev) =>
          prev + 1 >= pendingActions.length ? prev : prev + 1,
        );
      }, 1200);

      const history: AgentMessage[] = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await runAgentChat({
        message: "未遂タスクを続行",
        history,
        execute: true,
        context,
        actions_override: pendingActions,
      });

      const assistantMessage: UiMessage = {
        id: `a-pending-${Date.now()}`,
        role: "assistant",
        content: `未遂タスクの再実行を完了しました。${summarizeSteps(res.steps)}`,
        meta: { plan: res.plan, steps: res.steps, verification: res.verification },
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setPendingActions(res.pending_actions || []);
      setPendingPlan(res.pending_plan || []);
      const verdict = res.verification?.verdict;
      setPendingByVerdict(verdict === "partial" || verdict === "not_met");
      if (!res.pending_actions?.length) {
        setPhase("idle");
        setLivePlan([]);
        setLiveActions([]);
        setLiveStepIndex(0);
      }
      if (res.target_path && res.target_path !== pathname) {
        router.push(res.target_path);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "未遂タスクの実行に失敗しました。";
      setMessages((prev) => [
        ...prev,
        {
          id: `e-pending-${Date.now()}`,
          role: "assistant",
          content: `エラー: ${message}`,
        },
      ]);
    } finally {
      if (ticker) clearInterval(ticker);
      setLoading(false);
      if (pendingActions.length === 0) {
        setPhase("idle");
      }
    }
  };
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, phase, livePlan, liveStepIndex]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: UiMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setPendingActions([]);
    setPendingPlan([]);
    setPendingByVerdict(false);
    setPhase("planning");
    setLivePlan([]);
    setLiveActions([]);
    setLiveStepIndex(0);
    let ticker: ReturnType<typeof setInterval> | null = null;

    try {
      const history: AgentMessage[] = [...messages.slice(-7), userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const planned: AgentChatResponse = await runAgentChat({
        message: text,
        history,
        execute: false,
        context,
      });

      setLivePlan(planned.plan);
      setLiveActions(planned.actions || []);
      setPhase("executing");

      if ((planned.actions || []).length > 0) {
        ticker = setInterval(() => {
          setLiveStepIndex((prev) =>
            prev + 1 >= planned.actions.length ? prev : prev + 1,
          );
        }, 1200);
      }

      const res: AgentChatResponse = await runAgentChat({
        message: text,
        history,
        execute: true,
        context,
        actions_override: planned.actions,
      });

      const assistantMessage: UiMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: `処理を完了しました。${summarizeSteps(res.steps)}`,
        meta: { plan: res.plan, steps: res.steps, verification: res.verification },
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setPendingActions(res.pending_actions || []);
      setPendingPlan(res.pending_plan || []);
      const verdict = res.verification?.verdict;
      setPendingByVerdict(verdict === "partial" || verdict === "not_met");
      if (res.target_path && res.target_path !== pathname) {
        router.push(res.target_path);
      }
      setPhase("idle");
      setLiveStepIndex(0);
      setLiveActions([]);
      setLivePlan([]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Agent request failed.";
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `エラー: ${message}`,
        },
      ]);
      setPhase("idle");
      setLiveStepIndex(0);
      setLiveActions([]);
      setLivePlan([]);
      setPendingByVerdict(false);
    } finally {
      if (ticker) clearInterval(ticker);
      setLoading(false);
    }
  };

  return (
    <>
      <button
        aria-label="Open AI agent chat"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500 text-white shadow-lg shadow-sky-900/30 transition hover:scale-105 hover:bg-sky-400"
      >
        AI
      </button>

      <section
        className={`fixed z-50 flex flex-col overflow-hidden border border-border bg-background/95 shadow-2xl backdrop-blur transition-all duration-300 ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        } ${
          docked
            ? "right-0 top-0 h-screen w-[min(96vw,460px)] rounded-none"
            : "bottom-24 right-5 h-[70vh] w-[min(95vw,420px)] rounded-2xl"
        }`}
      >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">AIエージェント</p>
              <p className="text-xs text-muted-foreground">タスク実行チャット</p>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                onClick={resetConversation}
                title="新規会話"
                className="rounded-md p-1.5 hover:bg-muted"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 20h4l10-10a2.8 2.8 0 1 0-4-4L4 16v4z" />
                  <path d="M13 7l4 4" />
                </svg>
              </button>
              <button
                onClick={() => setDocked((v) => !v)}
                title="右サイドバー表示"
                className="rounded-md p-1.5 hover:bg-muted"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M15 5v14" />
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                title="閉じる"
                className="rounded-md p-1.5 hover:bg-muted"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                </svg>
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "ml-10 bg-sky-500/20"
                    : "mr-10 bg-muted/70"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.meta?.plan?.length ? (
                  <div className="mt-2 rounded-md border border-border/70 bg-background/70 p-2 text-xs">
                    <p className="mb-1 font-medium">計画</p>
                    {msg.meta.plan.map((p, i) => (
                      <p key={`${msg.id}-p-${i}`}>{i + 1}. {p}</p>
                    ))}
                    {msg.meta.steps?.length ? (
                      <>
                        <p className="mb-1 mt-2 font-medium">実行結果</p>
                        {msg.meta.steps.map((s, i) => (
                          <p key={`${msg.id}-s-${i}`}>
                            {i + 1}. [{s.status}] {s.action} - {s.detail}
                            {s.error ? ` (${s.error})` : ""}
                          </p>
                        ))}
                      </>
                    ) : null}
                    {msg.meta.verification ? (
                      <>
                        <p className="mb-1 mt-2 font-medium">検証</p>
                        <p>判定: {msg.meta.verification.verdict}</p>
                        <p>{msg.meta.verification.summary}</p>
                        {msg.meta.verification.achieved.length > 0 && (
                          <>
                            <p className="mt-1">できたこと:</p>
                            {msg.meta.verification.achieved.map((v, i) => (
                              <p key={`${msg.id}-va-${i}`}>- {v}</p>
                            ))}
                          </>
                        )}
                        {msg.meta.verification.missing.length > 0 && (
                          <>
                            <p className="mt-1">未達:</p>
                            {msg.meta.verification.missing.map((v, i) => (
                              <p key={`${msg.id}-vm-${i}`}>- {v}</p>
                            ))}
                          </>
                        )}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
            {phase !== "idle" && (
              <article className="mr-10 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm">
                <p className="font-medium">
                  {phase === "planning" ? "計画を作成中..." : "タスクを実行中..."}
                </p>
                {phase === "planning" && livePlan.length === 0 && (
                  <p className="mt-2 text-xs">TODOを組み立てています。</p>
                )}
                {livePlan.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs">
                    {livePlan.map((p, i) => {
                      const status =
                        phase === "planning"
                          ? "pending"
                          : i < liveStepIndex
                            ? "done"
                            : i === liveStepIndex
                              ? "running"
                              : "pending";
                      return (
                        <p key={`live-${i}`}>
                          {i + 1}. [{status}] {p}
                        </p>
                      );
                    })}
                  </div>
                )}
                {phase === "executing" && liveActions.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {Math.min(liveStepIndex + 1, liveActions.length)}/{liveActions.length} 実行中
                  </p>
                )}
              </article>
            )}
          </div>

          <form onSubmit={submit} className="border-t border-border p-3">
            <div className="mb-3 rounded-lg border border-border/70 bg-muted/20 p-2">
              <p className="px-1 pb-1 text-sm font-semibold">
                今日は何をお手伝いしましょうか？
              </p>
              <div className="space-y-0.5">
                {promptTemplates.map((tpl, i) => (
                  <button
                    key={`tpl-${i}`}
                    type="button"
                    onClick={() => setInput(tpl.prompt)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground/90 hover:bg-muted"
                  >
                    <svg
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      {i === 0 && (
                        <>
                          <circle cx="11" cy="11" r="7" />
                          <path d="M20 20l-3.5-3.5" />
                        </>
                      )}
                      {i === 1 && (
                        <>
                          <path d="M4 7h10" />
                          <path d="M4 12h7" />
                          <path d="M4 17h5" />
                          <path d="M17 8l3 3-3 3" />
                        </>
                      )}
                      {i === 2 && (
                        <>
                          <rect x="3" y="5" width="14" height="14" rx="2" />
                          <path d="M17 10h4v9h-9v-4" />
                        </>
                      )}
                      {i === 3 && (
                        <>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M8.5 12.5l2.2 2.2 4.8-4.8" />
                        </>
                      )}
                    </svg>
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {(pendingActions.length > 0 || pendingByVerdict) && (
              <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
                <p className="font-medium text-amber-200">未遂のタスクがあります。実行しますか？</p>
                {pendingPlan.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {pendingPlan.slice(0, 4).map((p, i) => (
                      <p key={`pending-plan-${i}`}>- {p}</p>
                    ))}
                    {pendingPlan.length > 4 && <p>...ほか {pendingPlan.length - 4} 件</p>}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={executePendingTasks}
                    disabled={loading || pendingActions.length === 0}
                    className="rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-black disabled:opacity-60"
                  >
                    実行する
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingActions([]);
                      setPendingPlan([]);
                      setPendingByVerdict(false);
                    }}
                    disabled={loading}
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground disabled:opacity-60"
                  >
                    破棄
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例: DNAサーベイ用プロジェクトを作成し、関連論文を3本追加して要約メモを作成"
                rows={3}
                className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm leading-5 outline-none ring-sky-400/50 placeholder:text-muted-foreground focus:ring-2"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? "処理中..." : "送信"}
              </button>
            </div>
          </form>
        </section>
    </>
  );
}
