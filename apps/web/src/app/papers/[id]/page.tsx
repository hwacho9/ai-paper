"use client";

/**
 * 論文詳細ページ
 * データ取得・状態管理を担当し、表示はコンポーネントへ分離
 */

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { MemoEditor } from "./_components/memo-editor";
import { PaperHeader } from "./_components/paper-header";
import type { Paper, Tab } from "./types";

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

  const [paperMemo, setPaperMemo] = useState<MemoResponse | null>(null);
  const [memosLoading, setMemosLoading] = useState(false);
  const [memoTitle, setMemoTitle] = useState("");
  const [memoBody, setMemoBody] = useState("");
  const [memoTags, setMemoTags] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);

  const [paperKeywords, setPaperKeywords] = useState<PaperKeywordResponse[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);

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

  const fetchMemo = useCallback(async () => {
    setMemosLoading(true);
    try {
      const data = await getMemos();
      const related = data.memos.find((memo) =>
        memo.refs.some((ref) => ref.ref_type === "paper" && ref.ref_id === id),
      );

      if (related) {
        setPaperMemo(related);
        setMemoTitle(related.title);
        setMemoBody(related.body);
        setMemoTags(related.tags.join(", "));
      } else {
        setPaperMemo(null);
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
    if (paper && !paperMemo && !memoTitle) {
      setMemoTitle(`Note: ${paper.title}`);
    }
  }, [paper, paperMemo, memoTitle]);

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

      await fetchMemo();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setMemoSaving(false);
    }
  };

  const handleDeleteMemo = async () => {
    if (!paperMemo) return;
    if (!confirm("このメモを削除しますか？")) return;

    try {
      await deleteMemo(paperMemo.id);
      setPaperMemo(null);
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

  const handleAddKeyword = async (label: string) => {
    const normalized = label.trim();
    if (!normalized) return;

    const alreadyTagged = paperKeywords.some(
      (keyword) => keyword.label.toLowerCase() === normalized.toLowerCase(),
    );
    if (alreadyTagged) return;

    try {
      const keywordId = await resolveKeywordIdByLabel(normalized);
      await tagPaperKeyword(id, { keyword_id: keywordId });
      await fetchPaperKeywords();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "キーワード追加に失敗しました");
      throw e;
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    try {
      await untagPaperKeyword(id, keywordId);
      await fetchPaperKeywords();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "キーワード削除に失敗しました");
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-32 rounded bg-muted/50" />
        <div className="glass-card rounded-xl p-6">
          <div className="mb-3 h-5 w-48 rounded bg-muted/50" />
          <div className="mb-3 h-8 w-3/4 rounded bg-muted/50" />
          <div className="h-4 w-1/2 rounded bg-muted/30" />
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

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "overview", label: "概要" },
    { key: "pdf", label: "PDF" },
    { key: "memos", label: "メモ" },
    { key: "related", label: "関連論文" },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
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

      <PaperHeader
        paper={paper}
        keywords={paperKeywords}
        keywordsLoading={keywordsLoading}
        keywordsError={keywordsError}
        onAddKeyword={handleAddKeyword}
        onDeleteKeyword={handleDeleteKeyword}
      />

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

      {activeTab === "overview" && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="mb-3 text-lg font-semibold">Abstract</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {paper.abstract || "(Abstractなし)"}
          </p>
        </div>
      )}

      {activeTab === "pdf" && (
        <div className="glass-card overflow-hidden rounded-xl">
          {paper.pdf_url ? (
            <>
              <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
                <span className="max-w-[60%] truncate text-xs text-muted-foreground">
                  {paper.pdf_url}
                </span>
                <a
                  href={paper.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
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

      {activeTab === "memos" && (
        <MemoEditor
          memo={paperMemo}
          loading={memosLoading}
          title={memoTitle}
          body={memoBody}
          tags={memoTags}
          saving={memoSaving}
          onChangeTitle={setMemoTitle}
          onChangeBody={setMemoBody}
          onChangeTags={setMemoTags}
          onSave={handleSaveMemo}
          onDelete={handleDeleteMemo}
        />
      )}

      {activeTab === "related" && (
        <div className="py-12 text-center text-muted-foreground">
          <div className="mb-3 text-4xl">🔗</div>
          <p>関連論文の分析機能は準備中です</p>
        </div>
      )}
    </div>
  );
}
