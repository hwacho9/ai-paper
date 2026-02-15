"use client";

/**
 * 論文詳細ページ
 * データ取得・状態管理を担当し、表示はコンポーネントへ分離
 */

import { use, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import {
    getMemos,
    createMemo,
    updateMemo,
    deleteMemo,
    createKeyword,
    listKeywords,
    getPaperKeywords,
    tagPaperKeywords,
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
import { useKeywordRelatedStatus } from "./_components/use-keyword-related-status";
import type { Paper, ProjectSummary, Tab } from "./types";

interface ProjectListResponse {
    projects: Array<ProjectSummary & { paper_count: number }>;
    total: number;
}

interface ProjectPaperResponse {
    paper_id: string;
}

export default function PaperDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);

    const searchParams = useSearchParams();

    const normalizePaperId = (rawId: string): string => {
        let next = rawId;
        for (let i = 0; i < 3; i++) {
            try {
                const decoded = decodeURIComponent(next);
                if (decoded === next) {
                    return decoded;
                }
                next = decoded;
            } catch {
                return next;
            }
        }
        return next;
    };

    const paperId = useMemo(() => normalizePaperId(id), [id]);

    const getDoiUrlFromId = (rawId: string): string | null => {
        const normalized = normalizePaperId(rawId);
        if (!normalized.toLowerCase().startsWith("doi:")) {
            return null;
        }

        const doi = normalized.slice(4).trim();
        if (!doi) return null;
        return `https://doi.org/${doi}`;
    };

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
    const [relatedFocusKeyword, setRelatedFocusKeyword] = useState<
        string | null
    >(null);
    const [relatedFocusRequestId, setRelatedFocusRequestId] = useState(0);
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
    const [keywordsAccessBlocked, setKeywordsAccessBlocked] = useState(false);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollingCountRef = useRef(0);
    const [keywordsError, setKeywordsError] = useState<string | null>(null);
    const {
        statusMap: keywordRelatedStatusMap,
        loading: keywordRelatedStatusLoading,
    } = useKeywordRelatedStatus(id, paperKeywords, keywordsLoading);
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [projectsError, setProjectsError] = useState<string | null>(null);

    useEffect(() => {
        const nextTab = resolveTab();
        setActiveTab((prev) => (prev === nextTab ? prev : nextTab));

        const nextPage = resolvePage();
        setTargetPage((prev) => (prev === nextPage ? prev : nextPage));
    }, [resolveTab, resolvePage]);

    const fetchPaper = useCallback(async (): Promise<boolean> => {
        try {
            setError(null);
            const data = await apiGet<Paper>(
                `/api/v1/library/${encodeURIComponent(paperId)}`,
            );
            setPaper(data);
            return true;
        } catch (e: unknown) {
            setError(
                e instanceof Error ? e.message : "論文の取得に失敗しました",
            );
            return false;
        } finally {
            setLoading(false);
        }
    }, [paperId]);

    const matchesPaperId = useCallback(
        (value: string) =>
            value === id || value === paperId || value === normalizePaperId(id),
        [id, paperId],
    );

    const fetchMemo = useCallback(async () => {
        setMemosLoading(true);
        try {
            const data = await getMemos();
            const related = data.memos.find((memo) =>
                memo.refs.some(
                    (ref) =>
                        ref.ref_type === "paper" && matchesPaperId(ref.ref_id),
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
    }, [matchesPaperId]);

    const fetchPaperKeywords = useCallback(async () => {
        setKeywordsLoading(true);
        try {
            setKeywordsError(null);
            setKeywordsAccessBlocked(false);
            const data = await getPaperKeywords(paperId);
            setPaperKeywords(data.keywords);
            // キーワードが見つかった場合のみloadingをfalseに
            if (data.keywords.length > 0) {
                setKeywordsLoading(false);
            }
            return data.keywords.length;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "";
            const blocked =
                message.includes("paper is not in your library") ||
                message.includes("API Error: 403");
            setKeywordsAccessBlocked(blocked);
            setKeywordsError(
                e instanceof Error
                    ? e.message
                    : "キーワードの取得に失敗しました",
            );
            setKeywordsLoading(false);
            return blocked ? -2 : -1;
        }
    }, [paperId]);

    const fetchProjectMembership = useCallback(async () => {
        setProjectsLoading(true);
        try {
            setProjectsError(null);
            const data = await apiGet<ProjectListResponse>("/api/v1/projects");
            const projectList: ProjectSummary[] = data.projects.map(
                (project) => ({
                    id: project.id,
                    title: project.title,
                }),
            );
            setProjects(projectList);

            const linkedIds = await Promise.all(
                projectList.map(async (project) => {
                    try {
                        const papers = await apiGet<ProjectPaperResponse[]>(
                            `/api/v1/projects/${project.id}/papers`,
                        );
                        return papers.some((entry) => entry.paper_id === id)
                            ? project.id
                            : null;
                    } catch {
                        return null;
                    }
                }),
            );

            setLinkedProjectIds(
                linkedIds.filter(
                    (projectId): projectId is string =>
                        typeof projectId === "string",
                ),
            );
        } catch (e: unknown) {
            setProjectsError(
                e instanceof Error
                    ? e.message
                    : "所属プロジェクトの取得に失敗しました",
            );
        } finally {
            setProjectsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            const paperFound = await fetchPaper();
            if (cancelled || !paperFound) return;

            await fetchMemo();
            const count = await fetchPaperKeywords();
            if (cancelled) return;

            setKeywordsInitialFetched(true);
            if (count === 0 && !keywordsAccessBlocked) {
                // キーワードが未生成 → ポーリング開始
                setKeywordsLoading(true);
            } else {
                setKeywordsLoading(false);
            }
        };

        init();
        fetchProjectMembership();

        return () => {
            cancelled = true;
        };
    }, [fetchPaper, fetchMemo, fetchPaperKeywords, fetchProjectMembership]);

    // キーワードが0件の場合、ポーリングで生成完了を待つ
    useEffect(() => {
        if (!keywordsInitialFetched) return;
        if (keywordsAccessBlocked) {
            setKeywordsLoading(false);
            return;
        }
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
            if (
                count < 0 ||
                (count && count > 0) ||
                pollingCountRef.current >= 10
            ) {
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
    }, [
        keywordsInitialFetched,
        paperKeywords.length,
        keywordsAccessBlocked,
        fetchPaperKeywords,
    ]);

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
                    tags: Array.from(
                        new Set([...(paperMemo.tags || []), originTag]),
                    ),
                });
            } else {
                const refs: MemoRef[] = [
                    { ref_type: "paper", ref_id: paperId, note: null },
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
            await tagPaperKeywords(paperId, {
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
            await untagPaperKeyword(paperId, keywordId);
            await fetchPaperKeywords();
        } catch (e: unknown) {
            alert(
                e instanceof Error ? e.message : "キーワード削除に失敗しました",
            );
            throw e;
        }
    };

    const handleKeywordClick = (label: string) => {
        setRelatedFocusKeyword(label);
        setRelatedFocusRequestId((prev) => prev + 1);
        setActiveTab("related");
    };

    const handleAddProject = async (projectId: string) => {
        if (linkedProjectIds.includes(projectId)) return;
        try {
            await apiPost(`/api/v1/projects/${projectId}/papers`, {
                paper_id: id,
                role: "reference",
                note: "",
            });
            setLinkedProjectIds((prev) => [...prev, projectId]);
        } catch (e: unknown) {
            alert(
                e instanceof Error
                    ? e.message
                    : "プロジェクトへの追加に失敗しました",
            );
            throw e;
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        try {
            await apiDelete(`/api/v1/projects/${projectId}/papers/${id}`);
            setLinkedProjectIds((prev) =>
                prev.filter((linkedId) => linkedId !== projectId),
            );
        } catch (e: unknown) {
            alert(
                e instanceof Error
                    ? e.message
                    : "プロジェクトからの削除に失敗しました",
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
        const doiUrl = getDoiUrlFromId(paperId);

        return (
            <div className="space-y-6">
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                    <p className="text-red-400">
                        {error || "論文が見つかりません"}
                    </p>
                    {doiUrl && (
                        <p className="mt-2">
                            <a
                                href={doiUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-primary underline hover:no-underline">
                                {doiUrl}
                            </a>
                        </p>
                    )}
                    <PaperBackLink />
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
                onKeywordClick={handleKeywordClick}
                keywordRelatedStatusMap={keywordRelatedStatusMap}
                keywordRelatedStatusLoading={keywordRelatedStatusLoading}
                projects={projects}
                linkedProjectIds={linkedProjectIds}
                projectsLoading={projectsLoading}
                projectsError={projectsError}
                onAddProject={handleAddProject}
                onDeleteProject={handleDeleteProject}
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

            {activeTab === "related" && (
                <RelatedPanel
                    paperId={paperId}
                    focusKeyword={relatedFocusKeyword}
                    focusRequestId={relatedFocusRequestId}
                />
            )}
        </div>
    );
}
