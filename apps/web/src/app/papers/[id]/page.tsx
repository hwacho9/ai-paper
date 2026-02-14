"use client";

/**
 * 論文詳細ページ
 * データ取得・状態管理を担当し、表示はコンポーネントへ分離
 */

import { use, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

    const searchParams = useSearchParams();

    const resolveTab = useCallback((): Tab => {
        const rawTab = searchParams.get("tab");
        if (
            rawTab === "overview" ||
            rawTab === "pdf" ||
            rawTab === "memos" ||
            rawTab === "related"
        ) {
            return rawTab;
        }
        return "overview";
    }, [searchParams]);

    const resolvePage = useCallback((): number => {
        const rawPage = searchParams.get("page");
        const parsed = rawPage ? Number(rawPage) : NaN;
        if (!Number.isFinite(parsed) || parsed < 1) {
            return 1;
        }
        return Math.floor(parsed);
    }, [searchParams]);

    const [activeTab, setActiveTab] = useState<Tab>(resolveTab());
    const [targetPage, setTargetPage] = useState<number>(resolvePage());
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
    const [keywordsLoading, setKeywordsLoading] = useState(true);
    const [keywordsInitialFetched, setKeywordsInitialFetched] = useState(false);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollingCountRef = useRef(0);
    const [keywordsError, setKeywordsError] = useState<string | null>(null);

    useEffect(() => {
        const nextTab = resolveTab();
        setActiveTab((prev) => (prev === nextTab ? prev : nextTab));

        const nextPage = resolvePage();
        setTargetPage((prev) => (prev === nextPage ? prev : nextPage));
    }, [resolveTab, resolvePage]);

    const fetchPaper = useCallback(async () => {
        try {
            setError(null);
            const data = await apiGet<Paper>(`/api/v1/library/${id}`);
            setPaper(data);
        } catch (e: unknown) {
            setError(
                e instanceof Error ? e.message : "論文の取得に失敗しました",
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchMemo = useCallback(async () => {
        setMemosLoading(true);
        try {
            const data = await getMemos();
            const related = data.memos.find((memo) =>
                memo.refs.some(
                    (ref) => ref.ref_type === "paper" && ref.ref_id === id,
                ),
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
            // キーワードが見つかった場合のみloadingをfalseに
            if (data.keywords.length > 0) {
                setKeywordsLoading(false);
            }
            return data.keywords.length;
        } catch (e: unknown) {
            setKeywordsError(
                e instanceof Error
                    ? e.message
                    : "キーワードの取得に失敗しました",
            );
            setKeywordsLoading(false);
            return -1; // error
        }
    }, [id]);

    useEffect(() => {
        fetchPaper();
        fetchMemo();
        fetchPaperKeywords().then((count) => {
            setKeywordsInitialFetched(true);
            if (count === 0) {
                // キーワードが未生成 → ポーリング開始
                setKeywordsLoading(true);
            } else {
                setKeywordsLoading(false);
            }
        });
    }, [fetchPaper, fetchMemo, fetchPaperKeywords]);

    // キーワードが0件の場合、ポーリングで生成完了を待つ
    useEffect(() => {
        if (!keywordsInitialFetched) return;
        if (paperKeywords.length > 0) {
            // 既にキーワードがある → ポーリング不要
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            setKeywordsLoading(false);
            return;
        }

        // 0件のときポーリング開始（3秒間隔、最大10回=30秒）
        pollingCountRef.current = 0;
        pollingRef.current = setInterval(async () => {
            pollingCountRef.current++;
            const count = await fetchPaperKeywords();
            if ((count && count > 0) || pollingCountRef.current >= 10) {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
                setKeywordsLoading(false);
            }
        }, 3000);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [keywordsInitialFetched, paperKeywords.length, fetchPaperKeywords]);

    useEffect(() => {
        if (paper && !paperMemo && !memoTitle) {
            setMemoTitle(`Paper: ${paper.title}`);
        }
    }, [paper, paperMemo, memoTitle]);

    const handleSaveMemo = async () => {
        if (!memoTitle.trim() && !memoBody.trim()) return;
        setMemoSaving(true);
        try {
            const originTag = "論文由来";
            if (paperMemo) {
                await updateMemo(paperMemo.id, {
                    title: memoTitle.trim(),
                    body: memoBody.trim(),
                    tags: Array.from(new Set([...(paperMemo.tags || []), originTag])),
                });
            } else {
                const refs: MemoRef[] = [
                    { ref_type: "paper", ref_id: id, note: null },
                ];
                await createMemo({
                    title: memoTitle.trim(),
                    body: memoBody.trim(),
                    tags: [originTag],
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

    const handleAddKeyword = async (label: string, reason?: string) => {
        const normalized = label.trim();
        if (!normalized) return;

        const alreadyTagged = paperKeywords.some(
            (keyword) =>
                keyword.label.toLowerCase() === normalized.toLowerCase(),
        );
        if (alreadyTagged) return;

        try {
            const keywordId = await resolveKeywordIdByLabel(normalized);
            await tagPaperKeyword(id, {
                keyword_id: keywordId,
                reason: reason || "llm_paper_keyword",
            });
            await fetchPaperKeywords();
        } catch (e: unknown) {
            alert(
                e instanceof Error ? e.message : "キーワード追加に失敗しました",
            );
            throw e;
        }
    };

    const handleDeleteKeyword = async (keywordId: string) => {
        try {
            await untagPaperKeyword(id, keywordId);
            await fetchPaperKeywords();
        } catch (e: unknown) {
            alert(
                e instanceof Error ? e.message : "キーワード削除に失敗しました",
            );
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
                    <p className="text-red-400">
                        {error || "論文が見つかりません"}
                    </p>
                    <Link
                        href="/library"
                        className="mt-2 inline-block text-sm text-primary hover:underline">
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

            {activeTab === "overview" && (
                <OverviewPanel abstract={paper.abstract} />
            )}

            {activeTab === "pdf" && (
                <PdfPanel
                    title={paper.title}
                    pdfUrl={paper.pdf_url}
                    page={targetPage}
                />
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
                    keywordsLoading={keywordsLoading}
                    onChangeTitle={setMemoTitle}
                    onChangeBody={setMemoBody}
                    onSave={handleSaveMemo}
                    onDelete={handleDeleteMemo}
                    onCreate={() => {
                        setMemoTitle(`Paper: ${paper.title}`);
                        setMemoBody(
                            "## 概要\n\n\n## 貢献\n- \n\n## 感想・メモ\n",
                        );
                        setMemoEditing(true);
                    }}
                />
            )}

            {activeTab === "related" && <RelatedPanel paperId={id} />}
        </div>
    );
}
