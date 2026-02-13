"use client";

/**
 * 論文詳細ページ
 * APIからデータ取得 + メモ連携（CRUD）
 */

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import {
  getMemos,
  createMemo,
  updateMemo,
  deleteMemo,
  MemoResponse,
  MemoRef,
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
  return date.toLocaleDateString("ja-JP");
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
  const [paperMemos, setPaperMemos] = useState<MemoResponse[]>([]);
  const [memosLoading, setMemosLoading] = useState(false);
  const [showMemoEditor, setShowMemoEditor] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoResponse | null>(null);
  const [memoTitle, setMemoTitle] = useState("");
  const [memoBody, setMemoBody] = useState("");
  const [memoTags, setMemoTags] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);

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

  // メモ取得（この論文に紐づくもの）
  const fetchMemos = useCallback(async () => {
    setMemosLoading(true);
    try {
      const data = await getMemos();
      const related = data.memos.filter((m) =>
        m.refs.some((r) => r.ref_type === "paper" && r.ref_id === id),
      );
      setPaperMemos(related);
    } catch {
      setPaperMemos([]);
    } finally {
      setMemosLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPaper();
    fetchMemos();
  }, [fetchPaper, fetchMemos]);

  // メモ新規作成を開く
  const openNewMemo = () => {
    setEditingMemo(null);
    setMemoTitle(paper ? `Note: ${paper.title}` : "");
    setMemoBody("## 概要\n\n\n## 貢献\n- \n\n## 感想・メモ\n");
    setMemoTags("");
    setShowMemoEditor(true);
  };

  // 既存メモ編集を開く
  const openEditMemo = (memo: MemoResponse) => {
    setEditingMemo(memo);
    setMemoTitle(memo.title);
    setMemoBody(memo.body);
    setMemoTags(memo.tags.join(", "));
    setShowMemoEditor(true);
  };

  // メモ保存
  const handleSaveMemo = async () => {
    if (!memoTitle.trim() && !memoBody.trim()) return;
    setMemoSaving(true);
    try {
      const tags = memoTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (editingMemo) {
        await updateMemo(editingMemo.id, {
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
      setShowMemoEditor(false);
      await fetchMemos();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setMemoSaving(false);
    }
  };

  // メモ削除
  const handleDeleteMemo = async (memoId: string) => {
    if (!confirm("このメモを削除しますか？")) return;
    try {
      await deleteMemo(memoId);
      setPaperMemos((prev) => prev.filter((m) => m.id !== memoId));
      if (editingMemo?.id === memoId) setShowMemoEditor(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "削除に失敗しました");
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
        <div className="h-10 w-full bg-muted/30 rounded-xl" />
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
    { key: "memos" as Tab, label: "メモ", count: paperMemos.length },
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

        {/* DOI & アクション */}
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
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  activeTab === tab.key
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {activeTab === "overview" && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-3">Abstract</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {paper.abstract || "(Abstractなし)"}
          </p>
        </div>
      )}

      {/* PDFタブ */}
      {activeTab === "pdf" && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-border">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <span className="text-2xl">📄</span>
              </div>
              <p className="text-sm font-medium">PDFビューア</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {paper.pdf_url
                  ? "PDFを読み込み中..."
                  : "PDFがアップロードされていません"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* メモタブ */}
      {activeTab === "memos" && (
        <div className="space-y-3">
          {memosLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="glass-card rounded-xl p-5 animate-pulse"
                >
                  <div className="h-5 w-1/2 bg-muted/50 rounded mb-2" />
                  <div className="h-3 w-full bg-muted/30 rounded mb-1" />
                  <div className="h-3 w-3/4 bg-muted/30 rounded" />
                </div>
              ))}
            </div>
          ) : paperMemos.length === 0 && !showMemoEditor ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">✏️</div>
              <p className="text-sm">この論文のメモはまだありません</p>
              <button
                onClick={openNewMemo}
                className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
              >
                メモを作成
              </button>
            </div>
          ) : (
            <>
              {paperMemos.map((memo) => (
                <div
                  key={memo.id}
                  onClick={() => openEditMemo(memo)}
                  className="glass-card group rounded-xl p-5 transition-all hover:border-primary/30 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium group-hover:text-primary transition-colors">
                      {memo.title || "無題のメモ"}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMemo(memo.id);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                        title="削除"
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
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {memo.body}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    {memo.tags.length > 0 && (
                      <div className="flex gap-1">
                        {memo.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatRelativeTime(memo.updated_at)}
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={openNewMemo}
                className="w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
              >
                + メモを追加
              </button>
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

      {/* メモエディタダイアログ */}
      {showMemoEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl rounded-2xl p-6 mx-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingMemo ? "メモを編集" : "メモを作成"}
              </h3>
              <button
                onClick={() => setShowMemoEditor(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 論文バッジ */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4 self-start">
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
              {paper.title}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
              <input
                type="text"
                value={memoTitle}
                onChange={(e) => setMemoTitle(e.target.value)}
                placeholder="タイトル"
                className="w-full bg-transparent text-xl font-bold outline-none placeholder:text-muted-foreground/40"
              />
              <div className="border-t border-border" />
              <textarea
                value={memoBody}
                onChange={(e) => setMemoBody(e.target.value)}
                placeholder="メモを入力..."
                rows={12}
                className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed placeholder:text-muted-foreground/40 font-mono"
              />
              <div>
                <label className="text-xs text-muted-foreground">
                  タグ（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={memoTags}
                  onChange={(e) => setMemoTags(e.target.value)}
                  placeholder="transformer, survey"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
              <div>
                {editingMemo && (
                  <button
                    onClick={() => handleDeleteMemo(editingMemo.id)}
                    className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    削除する
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMemoEditor(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  disabled={memoSaving}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveMemo}
                  disabled={
                    memoSaving || (!memoTitle.trim() && !memoBody.trim())
                  }
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                >
                  {memoSaving ? "保存中..." : editingMemo ? "保存" : "作成"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
