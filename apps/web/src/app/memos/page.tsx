"use client";

/**
 * メモ一覧ページ（Scrapbox風）
 * 「新規メモ」→ マイライブラリから論文を選択 → メモ編集
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getMemos,
  createMemo,
  updateMemo,
  deleteMemo,
  MemoResponse,
  MemoRef,
} from "@/lib/api";
import { apiGet } from "@/lib/api/client";

/* ---- 型定義 ---- */
interface LibraryPaper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  abstract: string;
}
interface LibraryResponse {
  papers: LibraryPaper[];
  total: number;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}時間前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}日前`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}週間前`;
  return date.toLocaleDateString("ja-JP");
}

type ViewState =
  | { mode: "list" }
  | { mode: "pick-paper" }
  | {
      mode: "editor";
      paper: LibraryPaper | null;
      existingMemo: MemoResponse | null;
    };

export default function MemosPage() {
  const [memos, setMemos] = useState<MemoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ビュー状態
  const [view, setView] = useState<ViewState>({ mode: "list" });

  // 論文選択
  const [libraryPapers, setLibraryPapers] = useState<LibraryPaper[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [paperSearch, setPaperSearch] = useState("");

  // エディタ
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchMemos = useCallback(async () => {
    try {
      setError(null);
      const data = await getMemos();
      setMemos(data.memos);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "メモの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  /* ---- 新規メモ → 論文選択画面へ ---- */
  const openPaperPicker = async () => {
    setView({ mode: "pick-paper" });
    setPaperSearch("");
    setLibraryLoading(true);
    try {
      const data = await apiGet<LibraryResponse>("/api/v1/library");
      setLibraryPapers(data.papers);
    } catch {
      setLibraryPapers([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  /* ---- 論文選択 → 既存メモがあれば開く / なければ新規 ---- */
  const selectPaper = (paper: LibraryPaper) => {
    // 既存メモを検索（この論文に紐づくメモがあるか）
    const existing = memos.find((m) =>
      m.refs.some((r) => r.ref_type === "paper" && r.ref_id === paper.id),
    );
    if (existing) {
      // 既存メモを開く
      setView({ mode: "editor", paper, existingMemo: existing });
      setEditTitle(existing.title);
      setEditBody(existing.body);
      setEditTags(existing.tags.join(", "));
    } else {
      // 新規作成
      setView({ mode: "editor", paper, existingMemo: null });
      setEditTitle(`Note: ${paper.title}`);
      setEditBody(`## 概要\n\n\n## 貢献\n- \n\n## 感想・メモ\n`);
      setEditTags("");
    }
  };

  /* ---- 既存メモを開く ---- */
  const openExistingMemo = (memo: MemoResponse) => {
    // 既存メモに紐づく論文情報は refs から取得
    const paperRef = memo.refs.find((r) => r.ref_type === "paper");
    const paper: LibraryPaper | null = paperRef
      ? {
          id: paperRef.ref_id,
          title: "",
          authors: [],
          year: null,
          venue: "",
          abstract: "",
        }
      : null;
    setView({ mode: "editor", paper, existingMemo: memo });
    setEditTitle(memo.title);
    setEditBody(memo.body);
    setEditTags(memo.tags.join(", "));
  };

  /* ---- 一覧へ戻る ---- */
  const backToList = () => {
    setView({ mode: "list" });
  };

  /* ---- 保存 ---- */
  const handleSave = async () => {
    if (!editTitle.trim() && !editBody.trim()) return;
    setSaving(true);
    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (view.mode === "editor" && view.existingMemo) {
        // 更新
        await updateMemo(view.existingMemo.id, {
          title: editTitle.trim(),
          body: editBody.trim(),
          tags,
        });
      } else if (view.mode === "editor") {
        // 新規作成
        const refs: MemoRef[] = view.paper
          ? [{ ref_type: "paper", ref_id: view.paper.id, note: null }]
          : [];
        await createMemo({
          title: editTitle.trim(),
          body: editBody.trim(),
          tags,
          refs,
        });
      }
      backToList();
      await fetchMemos();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  /* ---- 削除 ---- */
  const handleDelete = async (memoId: string) => {
    if (!confirm("このメモを削除しますか？")) return;
    try {
      await deleteMemo(memoId);
      if (view.mode === "editor" && view.existingMemo?.id === memoId)
        backToList();
      setMemos((prev) => prev.filter((m) => m.id !== memoId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  /* ---- フィルタ ---- */
  const filtered = memos.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.body.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const filteredLibrary = libraryPapers.filter((p) => {
    if (!paperSearch.trim()) return true;
    const q = paperSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.authors.some((a) => a.toLowerCase().includes(q))
    );
  });

  /* ================================================================
   *  論文選択画面
   * ================================================================ */
  if (view.mode === "pick-paper") {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* 戻る */}
        <button
          onClick={backToList}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          メモ一覧に戻る
        </button>

        <div>
          <h2 className="text-xl font-bold">論文を選択</h2>
          <p className="text-sm text-muted-foreground mt-1">
            メモを書く論文をマイライブラリから選んでください
          </p>
        </div>

        {/* 検索 */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={paperSearch}
            onChange={(e) => setPaperSearch(e.target.value)}
            placeholder="論文を検索..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* 論文リスト */}
        <div className="space-y-2">
          {libraryLoading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="glass-card rounded-xl p-4 animate-pulse"
                >
                  <div className="h-4 w-3/4 bg-muted/50 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-muted/30 rounded" />
                </div>
              ))}
            </div>
          )}

          {!libraryLoading && filteredLibrary.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-sm">
                {libraryPapers.length === 0
                  ? "マイライブラリに論文がありません"
                  : "該当する論文が見つかりません"}
              </p>
              <Link
                href="/search"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                論文を検索して追加する →
              </Link>
            </div>
          )}

          {!libraryLoading &&
            filteredLibrary.map((paper) => {
              const hasMemo = memos.some((m) =>
                m.refs.some(
                  (r) => r.ref_type === "paper" && r.ref_id === paper.id,
                ),
              );
              return (
                <button
                  key={paper.id}
                  onClick={() => selectPaper(paper)}
                  className="glass-card group w-full text-left flex items-center gap-3 rounded-xl p-4
                    transition-all hover:border-primary/40 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                    {paper.year?.toString().slice(-2) || "??"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                        {paper.title}
                      </h4>
                      {hasMemo && (
                        <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          メモあり
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {paper.authors.join(", ")}
                      {paper.venue ? ` · ${paper.venue}` : ""}
                    </p>
                  </div>
                  <svg
                    className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              );
            })}
        </div>

        {/* 検索へのリンク */}
        {!libraryLoading && libraryPapers.length > 0 && (
          <Link
            href="/search"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            論文を検索して追加する →
          </Link>
        )}
      </div>
    );
  }

  /* ================================================================
   *  エディタ画面
   * ================================================================ */
  if (view.mode === "editor") {
    const paperRef = view.existingMemo?.refs.find(
      (r) => r.ref_type === "paper",
    );
    const paperId = view.paper?.id || paperRef?.ref_id;
    const paperTitle =
      view.paper?.title ||
      view.existingMemo?.title?.replace("Note: ", "") ||
      "";

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* 戻るバー */}
        <button
          onClick={backToList}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          メモ一覧に戻る
        </button>

        {/* エディタカード */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          {/* 関連論文バッジ */}
          {paperId && (
            <Link
              href={`/papers/${paperId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              {paperTitle || "関連論文を見る"}
            </Link>
          )}

          {/* タイトル */}
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="タイトル"
            className="w-full bg-transparent text-xl font-bold outline-none placeholder:text-muted-foreground/40"
          />

          <div className="border-t border-border" />

          {/* 本文 */}
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            placeholder="メモを入力..."
            rows={16}
            className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed placeholder:text-muted-foreground/40 font-mono"
          />

          {/* タグ */}
          <div>
            <label className="text-xs text-muted-foreground">
              タグ（カンマ区切り）
            </label>
            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="transformer, survey, NLP"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* アクション */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              {view.existingMemo && (
                <button
                  onClick={() => handleDelete(view.existingMemo!.id)}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                >
                  削除する
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={backToList}
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                disabled={saving}
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || (!editTitle.trim() && !editBody.trim())}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
              >
                {saving ? "保存中..." : view.existingMemo ? "保存" : "作成"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
   *  メモ一覧（Scrapbox風グリッド）
   * ================================================================ */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-24 bg-muted/50 rounded animate-pulse" />
        <div className="h-9 w-full bg-muted/30 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="glass-card rounded-xl p-4 animate-pulse h-32"
            >
              <div className="h-4 w-3/4 bg-muted/50 rounded mb-2" />
              <div className="h-3 w-full bg-muted/30 rounded mb-1" />
              <div className="h-3 w-2/3 bg-muted/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">メモ</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {memos.length} 件
          </p>
        </div>
        <button
          onClick={openPaperPicker}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          新規メモ
        </button>
      </div>

      {/* エラー */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
          <button
            onClick={fetchMemos}
            className="ml-2 underline hover:text-red-300"
          >
            再試行
          </button>
        </div>
      )}

      {/* 検索 */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="メモを検索..."
          className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* 空状態 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-3">✏️</div>
          <h3 className="text-base font-semibold">
            {searchQuery ? "該当するメモがありません" : "メモがまだありません"}
          </h3>
          {!searchQuery && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                論文を選んでメモを記録しましょう。
              </p>
              <button
                onClick={openPaperPicker}
                className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
              >
                最初のメモを作成
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((memo) => {
            const paperRef = memo.refs.find((r) => r.ref_type === "paper");
            return (
              <button
                key={memo.id}
                onClick={() => openExistingMemo(memo)}
                className="glass-card group text-left rounded-xl p-4 transition-all duration-200
                  hover:scale-[1.03] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5
                  focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {memo.title || "無題のメモ"}
                </h4>
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {memo.body || "(本文なし)"}
                </p>
                {memo.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {memo.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                    {memo.tags.length > 2 && (
                      <span className="text-[9px] text-muted-foreground">
                        +{memo.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  {paperRef ? (
                    <span className="text-[9px] text-primary/60">
                      📄 論文メモ
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="text-[9px] text-muted-foreground">
                    {formatRelativeTime(memo.updated_at)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
