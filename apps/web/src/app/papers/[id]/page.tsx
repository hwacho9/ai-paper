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
import { PaperBackLink } from "./_components/paper-back-link";
import { PaperTabs } from "./_components/paper-tabs";
import { OverviewPanel } from "./_components/overview-panel";
import { PdfPanel } from "./_components/pdf-panel";
import { RelatedPanel } from "./_components/related-panel";
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
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoEditing, setMemoEditing] = useState(false);

  const [paperKeywords, setPaperKeywords] = useState<PaperKeywordResponse[]>(
    [],
  );
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
      } else {
        setPaperMemo(null);
        setMemoEditing(false);
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
      if (paperMemo) {
        await updateMemo(paperMemo.id, {
          title: memoTitle.trim(),
          body: memoBody.trim(),
        });
      } else {
        const refs: MemoRef[] = [{ ref_type: "paper", ref_id: id, note: null }];
        await createMemo({
          title: memoTitle.trim(),
          body: memoBody.trim(),
          refs,
        });
      }

      await fetchMemo();
      setMemoEditing(false);
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
      setMemoEditing(false);
      setMemoTitle("");
      setMemoBody("");
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

  return (
    <div className="space-y-6">
      <PaperBackLink />

      <PaperHeader
        paper={paper}
        keywords={paperKeywords}
        keywordsLoading={keywordsLoading}
        keywordsError={keywordsError}
        onAddKeyword={handleAddKeyword}
        onDeleteKeyword={handleDeleteKeyword}
      />

      <PaperTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && <OverviewPanel abstract={paper.abstract} />}

      {activeTab === "pdf" && (
        <PdfPanel title={paper.title} pdfUrl={paper.pdf_url} />
      )}

      {activeTab === "memos" && (
        <MemoEditor
          memo={paperMemo}
          loading={memosLoading}
          editing={memoEditing}
          title={memoTitle}
          body={memoBody}
          saving={memoSaving}
          keywords={paperKeywords}
          onChangeTitle={setMemoTitle}
          onChangeBody={setMemoBody}
          onSave={handleSaveMemo}
          onDelete={handleDeleteMemo}
          onCreate={() => {
            setMemoTitle(`Note: ${paper.title}`);
            setMemoBody("## 概要\n\n\n## 貢献\n- \n\n## 感想・メモ\n");
            setMemoEditing(true);
          }}
        />
      )}

      {activeTab === "related" && <RelatedPanel />}
    </div>
  );
}
