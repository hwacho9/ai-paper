"use client";

/**
 * 論文詳細ページ
 * APIからデータ取得 + メモ連携（CRUD）
 */

import { use, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Check, Plus, Trash2 } from "lucide-react";
import { apiGet } from "@/lib/api/client";
import {
  getMemos,
  createMemo,
  updateMemo,
  deleteMemo,
  createKeyword,
  listKeywords,
  listPaperKeywords,
  tagPaperKeyword,
  untagPaperKeyword,
  MemoResponse,
  MemoRef,
  PaperKeywordResponse,
} from "@/lib/api";

type Tab = "overview" | "pdf" | "memos" | "related";

interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  abstract: string;
  doi: string | null;
  arxiv_id: string | null;
  pdf_url: string | null;
  status: string;
  is_liked: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export default function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // メモ関連
  const [paperMemo, setPaperMemo] = useState<MemoResponse | null>(null);
  const [memosLoading, setMemosLoading] = useState(false);

  // エディタ状態
  const [memoTitle, setMemoTitle] = useState("");
  const [memoBody, setMemoBody] = useState("");
  const [memoTags, setMemoTags] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);

  // キーワード関連
  const [paperKeywords, setPaperKeywords] = useState<PaperKeywordResponse[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  const [keywordInputOpen, setKeywordInputOpen] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [keywordSubmitting, setKeywordSubmitting] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);

  // 論文データ取得
  const fetchPaper = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGet<Paper>(`/api/v1/library/${id}`);
      setPaper(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "論文の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // メモ取得（この論文に紐づくもの、1つだけ）
  const fetchMemo = useCallback(async () => {
    setMemosLoading(true);
    try {
      const data = await getMemos();
      const related = data.memos.find((m) =>
        m.refs.some((r) => r.ref_type === "paper" && r.ref_id === id),
      );

      if (related) {
        setPaperMemo(related);
        setMemoTitle(related.title);
        setMemoBody(related.body);
        setMemoTags(related.tags.join(", "));
      } else {
        setPaperMemo(null);
        // 新規作成用テンプレート
        // paperステートがまだセットされていない可能性を考慮
        setMemoTitle("");
        setMemoBody("## 概要\n\n\n## 貢献\n- \n\n## 感想・メモ\n");
        setMemoTags("");
      }
    } catch {
      setPaperMemo(null);
    } finally {
      setMemosLoading(false);
    }
  }, [id]);

  const fetchPaperKeywords = useCallback(async () => {
    setKeywordsLoading(true);
    try {
      setKeywordsError(null);
      const data = await listPaperKeywords(id);
      setPaperKeywords(data.keywords);
    } catch (e: unknown) {
      setKeywordsError(
        e instanceof Error ? e.message : "キーワードの取得に失敗しました",
      );
    } finally {
      setKeywordsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPaper();
    fetchMemo();
    fetchPaperKeywords();
  }, [fetchPaper, fetchMemo, fetchPaperKeywords]);

  useEffect(() => {
    if (keywordInputOpen) {
      keywordInputRef.current?.focus();
    }
  }, [keywordInputOpen]);

  // paper読み込み完了後にタイトルをセット（新規の場合のみ）
  useEffect(() => {
    if (paper && !paperMemo && !memoTitle) {
      setMemoTitle(`Note: ${paper.title}`);
    }
  }, [paper, paperMemo, memoTitle]);

  // メモ保存
  const handleSaveMemo = async () => {
    if (!memoTitle.trim() && !memoBody.trim()) return;
    setMemoSaving(true);
    try {
      const tags = memoTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (paperMemo) {
        await updateMemo(paperMemo.id, {
          title: memoTitle.trim(),
          body: memoBody.trim(),
          tags,
        });
      } else {
        const refs: MemoRef[] = [{ ref_type: "paper", ref_id: id, note: null }];
        await createMemo({
          title: memoTitle.trim(),
          body: memoBody.trim(),
          tags,
          refs,
        });
      }
      await fetchMemo(); // 再取得して状態更新
      // 保存完了トーストなどを出しても良い
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setMemoSaving(false);
    }
  };

  // メモ削除
  const handleDeleteMemo = async () => {
    if (!paperMemo) return;
    if (!confirm("このメモを削除しますか？")) return;
    try {
      await deleteMemo(paperMemo.id);
      setPaperMemo(null);
      // リセット
      if (paper) setMemoTitle(`Note: ${paper.title}`);
      setMemoBody("## 概要\n\n\n## 貢献\n- \n\n## 感想・メモ\n");
      setMemoTags("");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const resolveKeywordIdByLabel = async (label: string): Promise<string> => {
    const keywordList = await listKeywords();
    const existing = keywordList.keywords.find((k) => k.label === label);
    if (existing) return existing.id;

    const created = await createKeyword({ label, description: "" });
    return created.id;
  };

  const handleAddKeyword = async () => {
    const label = keywordDraft.trim();
    if (!label || keywordSubmitting) return;

    const alreadyTagged = paperKeywords.some(
      (k) => k.label.toLowerCase() === label.toLowerCase(),
    );
    if (alreadyTagged) {
      setKeywordDraft("");
      setKeywordInputOpen(false);
      return;
    }

    setKeywordSubmitting(true);
    try {
      const keywordId = await resolveKeywordIdByLabel(label);
      await tagPaperKeyword(id, { keyword_id: keywordId });
      await fetchPaperKeywords();
      setKeywordDraft("");
      setKeywordInputOpen(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "キーワード追加に失敗しました");
    } finally {
      setKeywordSubmitting(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    if (!deleteMode || deletingKeywordId) return;
    setDeletingKeywordId(keywordId);
    try {
      await untagPaperKeyword(id, keywordId);
      await fetchPaperKeywords();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "キーワード削除に失敗しました");
    } finally {
      setDeletingKeywordId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-muted/50 rounded" />
        <div className="glass-card rounded-xl p-6">
          <div className="h-5 w-48 bg-muted/50 rounded mb-3" />
          <div className="h-8 w-3/4 bg-muted/50 rounded mb-3" />
          <div className="h-4 w-1/2 bg-muted/30 rounded" />
        </div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">{error || "論文が見つかりません"}</p>
          <Link
            href="/library"
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            ← ライブラリに戻る
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "overview" as Tab, label: "概要" },
    { key: "pdf" as Tab, label: "PDF" },
    { key: "memos" as Tab, label: "メモ" }, // count削除
    { key: "related" as Tab, label: "関連論文" },
  ];

  return (
    <div className="space-y-6">
      {/* 戻るリンク */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
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
        ライブラリに戻る
      </Link>

      {/* ヘッダー */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                  paper.status === "READY"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : paper.status === "INGESTING"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {paper.status}
              </span>
              <span className="text-xs text-muted-foreground">
                {paper.venue} {paper.year}
              </span>
            </div>
            <h2 className="text-2xl font-bold leading-tight">{paper.title}</h2>
            <div className="mt-3 flex flex-wrap gap-1">
              {paper.authors.map((a) => (
                <span key={a} className="text-sm text-muted-foreground">
                  {a},{" "}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
          {paper.doi && (
            <span className="text-xs text-muted-foreground">
              DOI: {paper.doi}
            </span>
          )}
          {paper.arxiv_id && (
            <span className="text-xs text-muted-foreground">
              arXiv: {paper.arxiv_id}
            </span>
          )}
        </div>
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">キーワード</span>
            <button
              type="button"
              onClick={() => setDeleteMode((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
                deleteMode
                  ? "border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25"
                  : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              {deleteMode ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  完了
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  削除モード
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {keywordsLoading && (
              <span className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                読み込み中...
              </span>
            )}

            {!keywordsLoading &&
              paperKeywords.map((keyword) => (
                <button
                  key={keyword.keyword_id}
                  type="button"
                  onClick={() => handleDeleteKeyword(keyword.keyword_id)}
                  disabled={!deleteMode || deletingKeywordId === keyword.keyword_id}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                    deleteMode
                      ? "border-red-400/60 bg-red-500/15 text-red-300 hover:bg-red-500/25"
                      : "cursor-default border-sky-400/40 bg-sky-400/20 text-sky-200"
                  } ${deletingKeywordId === keyword.keyword_id ? "opacity-60" : ""}`}
                >
                  {keyword.label}
                </button>
              ))}

            {keywordInputOpen ? (
              <input
                ref={keywordInputRef}
                type="text"
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                  if (e.key === "Escape") {
                    setKeywordInputOpen(false);
                    setKeywordDraft("");
                  }
                }}
                onBlur={() => {
                  if (!keywordSubmitting && !keywordDraft.trim()) {
                    setKeywordInputOpen(false);
                  }
                }}
                placeholder="キーワードを入力"
                className="h-7 w-36 rounded-md border border-sky-400/50 bg-background px-2 text-xs outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDeleteMode(false);
                  setKeywordInputOpen(true);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-sky-400/50 bg-sky-400/15 text-sky-200 transition-colors hover:bg-sky-400/25"
                aria-label="キーワード追加"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          {keywordsError && (
            <p className="mt-2 text-xs text-red-400">{keywordsError}</p>
          )}
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 rounded-xl bg-muted/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3">Abstract</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {paper.abstract || "(Abstractなし)"}
            </p>
          </div>

          {/* キーワードセクション */}
          {(paper.keywords?.length > 0 ||
            paper.prerequisite_keywords?.length > 0) && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              {/* 論文キーワード */}
              {paper.keywords?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                    Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {paper.keywords.map((kw: string, i: number) => (
                      <span
                        key={i}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 事前知識キーワード */}
              {paper.prerequisite_keywords?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                    Prerequisite Knowledge
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {paper.prerequisite_keywords.map(
                      (kw: string, i: number) => (
                        <span
                          key={i}
                          className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400"
                        >
                          {kw}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PDFタブ */}
      {activeTab === "pdf" && (
        <div className="glass-card rounded-xl overflow-hidden">
          {paper.pdf_url ? (
            <>
              {/* ツールバー */}
              <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-muted/20">
                <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                  {paper.pdf_url}
                </span>
                <a
                  href={paper.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                  新しいタブで開く
                </a>
              </div>
              {/* PDF iframe */}
              <iframe
                src={paper.pdf_url}
                className="w-full border-0"
                style={{ height: "80vh" }}
                title={`${paper.title} - PDF`}
              />
            </>
          ) : (
            <div className="flex h-96 items-center justify-center p-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30">
                  <span className="text-2xl">📄</span>
                </div>
                <p className="text-sm font-medium">PDFが見つかりません</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  この論文にはPDF URLが登録されていません
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* メモタブ (インラインエディタ) */}
      {activeTab === "memos" && (
        <div className="glass-card rounded-xl p-6 flex flex-col min-h-[500px]">
          {memosLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-1/3 bg-muted/50 rounded" />
              <div className="h-64 w-full bg-muted/30 rounded" />
            </div>
          ) : (
            <>
              {/* エディタヘッダー */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    {paperMemo ? "メモを編集" : "新しいメモを作成"}
                  </h3>
                  {paperMemo && (
                    <span className="text-xs text-muted-foreground">
                      最終更新:{" "}
                      {new Date(paperMemo.updated_at).toLocaleString("ja-JP")}
                    </span>
                  )}
                </div>
                {paperMemo && (
                  <button
                    onClick={handleDeleteMemo}
                    className="text-xs text-red-400 hover:text-red-500 transition-colors"
                  >
                    このメモを削除
                  </button>
                )}
              </div>

              {/* タイトル入力 */}
              <input
                type="text"
                value={memoTitle}
                onChange={(e) => setMemoTitle(e.target.value)}
                placeholder="タイトル"
                className="w-full bg-transparent text-xl font-bold outline-none placeholder:text-muted-foreground/40 mb-4"
              />

              <div className="border-t border-border mb-4" />

              {/* 本文入力 */}
              <textarea
                value={memoBody}
                onChange={(e) => setMemoBody(e.target.value)}
                placeholder="Markdownでメモを記述..."
                className="w-full flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed placeholder:text-muted-foreground/40 font-mono min-h-[300px]"
              />

              {/* タグ入力 */}
              <div className="mt-4">
                <label className="text-xs text-muted-foreground block mb-1">
                  タグ（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={memoTags}
                  onChange={(e) => setMemoTags(e.target.value)}
                  placeholder="transformer, survey"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* 保存ボタン */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveMemo}
                  disabled={
                    memoSaving || (!memoTitle.trim() && !memoBody.trim())
                  }
                  className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg hover:shadow-primary/20"
                >
                  {memoSaving ? "保存中..." : "保存する"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 関連論文タブ */}
      {activeTab === "related" && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">🔗</div>
          <p>関連論文の分析機能は準備中です</p>
        </div>
      )}
    </div>
  );
}
