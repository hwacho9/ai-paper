"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, PanelRightOpen, Send, Sparkles, X } from "lucide-react";
import { sendAgentChat, type AgentAction, type AgentChatResponse } from "@/lib/api/agent";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AgentAction[];
};

const DEFAULT_PROMPT =
  "新しく「LLM Survey」という名前でプロジェクトを作って、関連論文を集めて読む順番を教えて";
const PROMPT_TEMPLATES = [
  "新しく「Transformer Survey」という名前でプロジェクトを作って、関連論文を10本追加して",
  "「Attention Is All You Need」の論文内容を3行で要約して",
  "RAGに関連する重要論文を5本集めて、読む順番を提案して",
  "いま保存している論文の中で、次に読むべき候補を提案して",
];

export function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<"floating" | "sidebar">(
    "floating",
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextProjectId, setContextProjectId] = useState<string | null>(null);
  const [contextPapers, setContextPapers] = useState<
    AgentChatResponse["papers"]
  >([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "AI Agentです。プロジェクト作成・論文検索・ライブラリ保存・読書順提案に加えて、論文内容の説明にも対応しています。",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading, open]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading],
  );

  const pushAssistantResponse = (res: AgentChatResponse) => {
    if (res.project?.id) {
      setContextProjectId(res.project.id);
    }
    if (res.papers.length > 0) {
      setContextPapers(res.papers);
    }
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.reply,
        actions: res.actions,
      },
    ]);
  };

  const handleSend = async () => {
    const message = input.trim();
    if (!message || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: message },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendAgentChat({
        message,
        source: "arxiv",
        search_limit: 8,
        attach_top_k: 5,
        context_project_id: contextProjectId,
        context_papers: contextPapers,
      });
      pushAssistantResponse(res);
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "AI Agentの実行に失敗しました。";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `エラー: ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`fixed z-50 flex flex-col overflow-hidden border border-border bg-card/95 shadow-2xl backdrop-blur transition-all duration-300 ease-out ${
          displayMode === "sidebar"
            ? `right-0 top-0 h-screen w-[min(520px,100vw)] rounded-none border-l ${
                open
                  ? "translate-x-0 opacity-100"
                  : "pointer-events-none translate-x-full opacity-0"
              }`
            : `inset-x-3 bottom-3 top-16 rounded-2xl md:inset-x-auto md:bottom-24 md:right-6 md:top-auto md:h-[70vh] md:w-[420px] ${
                open
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-4 scale-95 opacity-0"
              }`
        }`}
      >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/20 p-1.5 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Paper Agent</p>
                <p className="text-xs text-muted-foreground">
                  IDE内タスクを自動実行
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setDisplayMode((prev) =>
                    prev === "floating" ? "sidebar" : "floating",
                  )
                }
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="toggle-display-mode"
                title={
                  displayMode === "floating"
                    ? "サイドバー表示に切替"
                    : "フローティング表示に切替"
                }
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[88%] break-words rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "max-w-[92%] break-words rounded-2xl rounded-bl-md bg-secondary px-3 py-2 text-sm"
                  }
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                      {m.actions.map((a, idx) => (
                        <p key={`${m.id}-${idx}`} className="text-xs text-muted-foreground">
                          • {a.detail}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  実行中...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {PROMPT_TEMPLATES.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setInput(template)}
                  className="max-w-full truncate rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  title={template}
                >
                  {template}
                </button>
              ))}
            </div>
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setInput(DEFAULT_PROMPT)}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                例を入力
              </button>
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                rows={2}
                placeholder="やってほしい作業を入力..."
                className="min-h-14 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className="rounded-xl bg-primary p-2.5 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                aria-label="send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-4 text-white shadow-xl transition hover:scale-105 md:bottom-6 md:right-6"
          aria-label="open-agent-chat"
        >
          <Bot className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
