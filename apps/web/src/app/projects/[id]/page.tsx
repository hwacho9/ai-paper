"use client";

/**
 * プロジェクト詳細ページ
 * Firestore からプロジェクトデータを取得して表示
 * タブ切替: LaTeX / プロジェクト内の文献 / メモ
 */

import { useState, useEffect, useCallback, use, useMemo, useRef } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { GraphView } from "./_components/graph-view";
import {
    getMemos,
    createMemo,
    updateMemo,
    deleteMemo,
    type MemoResponse,
} from "@/lib/api";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";
import { auth } from "@/lib/firebase";

type Tab = "latex" | "literature" | "memos";

interface Project {
    id: string;
    owner_uid: string;
    title: string;
    description: string;
    paper_count: number;
    status: string;
    created_at: string | null;
    updated_at: string | null;
}

interface ProjectPaper {
    paper_id: string;
    note: string;
    role: string;
    added_at: string | null;
}

interface PaperDetail {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
    venue: string;
    abstract: string;
}

interface LibraryPaper {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
    venue: string;
    abstract: string;
    status: string;
    is_liked: boolean;
}

interface LibraryResponse {
    papers: LibraryPaper[];
    total: number;
}

interface MentionMatch {
    start: number;
    end: number;
    paperId: string;
    label: string;
}

interface TexFileItem {
    path: string;
    size: number;
    contentType: string;
    updatedAt: string;
}

interface TexFileContentResponse {
    path: string;
    content: string;
}

interface TexCompileResponse {
    pdf_path: string;
    pdf_url: string | null;
    log: string | null;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeCiteKey(paperId: string): string {
    const key = paperId.replace(/[^a-zA-Z0-9:_-]/g, "");
    return key || "paper";
}

interface TextRange {
    start: number;
    end: number;
}

function withCacheBust(url: string): string {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}t=${Date.now()}`;
}

export default function ProjectDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState<Tab>("latex");
    const [project, setProject] = useState<Project | null>(null);
    const [papers, setPapers] = useState<ProjectPaper[]>([]);
    const [paperDetails, setPaperDetails] = useState<Map<string, PaperDetail>>(
        new Map(),
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 論文追加ダイアログ
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [libraryPapers, setLibraryPapers] = useState<LibraryPaper[]>([]);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [addingPaperId, setAddingPaperId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [texFiles, setTexFiles] = useState<TexFileItem[]>([]);
    const [selectedTexPath, setSelectedTexPath] = useState("main.tex");
    const [texLoading, setTexLoading] = useState(false);
    const [texSaving, setTexSaving] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const [leftPanelMode, setLeftPanelMode] = useState<"files" | "search" | null>(
        null,
    );
    const [compileLog, setCompileLog] = useState<string | null>(null);
    const [logExpanded, setLogExpanded] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [docSearchQuery, setDocSearchQuery] = useState("");
    const [bibtexExpanded, setBibtexExpanded] = useState(false);
    const [latexContent, setLatexContent] = useState(
        "\\section{Introduction}\n\n",
    );
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [projectMemos, setProjectMemos] = useState<MemoResponse[]>([]);
    const [memosLoading, setMemosLoading] = useState(false);
    const [memoSearchQuery, setMemoSearchQuery] = useState("");
    const [memoTitle, setMemoTitle] = useState("");
    const [memoBody, setMemoBody] = useState("");
    const [memoSaving, setMemoSaving] = useState(false);
    const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
    const latexEditorRef = useRef<HTMLTextAreaElement>(null);
    const texFileInputRef = useRef<HTMLInputElement>(null);
    const pdfObjectUrlRef = useRef<string | null>(null);

    const fetchProject = useCallback(async () => {
        try {
            setError(null);
            const [projectData, papersData] = await Promise.all([
                apiGet<Project>(`/api/v1/projects/${id}`),
                apiGet<ProjectPaper[]>(`/api/v1/projects/${id}/papers`),
            ]);
            setProject(projectData);
            setPapers(papersData);

            // 論文の詳細を取得
            const details = new Map<string, PaperDetail>();
            await Promise.all(
                papersData.map(async (paper) => {
                    try {
                        const detail = await apiGet<PaperDetail>(
                            `/api/v1/library/${paper.paper_id}`,
                        );
                        details.set(paper.paper_id, detail);
                    } catch (e) {
                        console.error(
                            `Failed to fetch details for paper ${paper.paper_id}`,
                            e,
                        );
                    }
                }),
            );

            setPaperDetails(details);
        } catch (e: unknown) {
            const message =
                e instanceof Error
                    ? e.message
                    : "プロジェクトの取得に失敗しました";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    const fetchProjectMemos = useCallback(async () => {
        setMemosLoading(true);
        try {
            const data = await getMemos();
            const filtered = data.memos
                .filter((memo) =>
                    memo.refs.some(
                        (ref) => ref.ref_type === "project" && ref.ref_id === id,
                    ),
                )
                .sort((a, b) => {
                    const at = a.updated_at || a.created_at || "";
                    const bt = b.updated_at || b.created_at || "";
                    return bt.localeCompare(at);
                });
            setProjectMemos(filtered);
        } catch (e) {
            console.error("Failed to load project memos", e);
        } finally {
            setMemosLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProjectMemos();
    }, [fetchProjectMemos]);

    const resetMemoEditor = useCallback(() => {
        setEditingMemoId(null);
        setMemoTitle("");
        setMemoBody("");
    }, []);

    const openMemoEditor = (memo: MemoResponse) => {
        setEditingMemoId(memo.id);
        setMemoTitle(memo.title);
        setMemoBody(memo.body);
    };

    const handleSaveMemo = async () => {
        const title = memoTitle.trim();
        const body = memoBody.trim();
        if (!title && !body) return;
        setMemoSaving(true);
        try {
            if (editingMemoId) {
                const current = projectMemos.find((m) => m.id === editingMemoId);
                await updateMemo(editingMemoId, {
                    title,
                    body,
                    tags: current?.tags || [],
                });
            } else {
                await createMemo({
                    title,
                    body,
                    tags: [],
                    refs: [{ ref_type: "project", ref_id: id, note: null }],
                });
            }
            await fetchProjectMemos();
            resetMemoEditor();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "メモの保存に失敗しました");
        } finally {
            setMemoSaving(false);
        }
    };

    const handleDeleteMemo = async (memoId: string) => {
        if (!confirm("このメモを削除しますか？")) return;
        try {
            await deleteMemo(memoId);
            setProjectMemos((prev) => prev.filter((memo) => memo.id !== memoId));
            if (editingMemoId === memoId) {
                resetMemoEditor();
            }
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "メモの削除に失敗しました");
        }
    };

    const openAddDialog = async () => {
        setShowAddDialog(true);
        setSearchQuery("");
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

    const handleAddPaper = async (paper: LibraryPaper) => {
        setAddingPaperId(paper.id);
        try {
            await apiPost(`/api/v1/projects/${id}/papers`, {
                paper_id: paper.id,
            });
            // ローカルstateに即追加
            setPapers((prev) => [
                ...prev,
                {
                    paper_id: paper.id,
                    note: "",
                    role: "reference",
                    added_at: new Date().toISOString(),
                },
            ]);
            setPaperDetails((prev) => {
                const next = new Map(prev);
                next.set(paper.id, {
                    id: paper.id,
                    title: paper.title,
                    authors: paper.authors,
                    year: paper.year,
                    venue: paper.venue,
                    abstract: paper.abstract,
                });
                return next;
            });
        } catch (e: unknown) {
            const message =
                e instanceof Error ? e.message : "追加に失敗しました";
            alert(message);
        } finally {
            setAddingPaperId(null);
        }
    };

    const insertCitationAtCursor = (citeKey: string) => {
        const citation = `\\cite{${citeKey}}`;
        const textarea = latexEditorRef.current;
        if (!textarea) {
            setLatexContent(
                (prev) =>
                    `${prev}${prev.endsWith("\n") ? "" : "\n"}${citation}`,
            );
            return;
        }

        const start = textarea.selectionStart ?? latexContent.length;
        const end = textarea.selectionEnd ?? latexContent.length;
        const next =
            latexContent.slice(0, start) + citation + latexContent.slice(end);
        setLatexContent(next);

        requestAnimationFrame(() => {
            textarea.focus();
            const cursor = start + citation.length;
            textarea.setSelectionRange(cursor, cursor);
        });
    };

    const focusEditorRange = useCallback((start: number, end?: number) => {
        const textarea = latexEditorRef.current;
        if (!textarea) return;
        textarea.focus();
        const safeEnd = end ?? start;
        textarea.setSelectionRange(start, safeEnd);
    }, []);

    const findPaperRangeInText = useCallback(
        (text: string, title: string, citeKey: string): TextRange | null => {
            const safeTitle = title.trim();
            if (safeTitle.length >= 3) {
                const titleRegex = new RegExp(escapeRegExp(safeTitle), "i");
                const titleMatch = titleRegex.exec(text);
                if (titleMatch && titleMatch.index >= 0) {
                    return {
                        start: titleMatch.index,
                        end: titleMatch.index + titleMatch[0].length,
                    };
                }
            }
            const cite = `\\cite{${citeKey}}`;
            const citeIndex = text.indexOf(cite);
            if (citeIndex >= 0) {
                return {
                    start: citeIndex,
                    end: citeIndex + cite.length,
                };
            }
            return null;
        },
        [],
    );

    const handleSelectTexFile = async (path: string) => {
        if (isTextTexFile(selectedTexPath)) {
            await saveCurrentTexFile();
        }
        setSelectedTexPath(path);
        if (isTextTexFile(path)) {
            await loadTexFileContent(path);
        } else {
            setLatexContent("");
        }
    };

    const handleUploadTexFiles = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const files = e.target.files;
        if (!files) return;
        const token = await auth?.currentUser?.getIdToken();
        if (!token) return;

        for (const file of Array.from(files)) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("path", file.name);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/projects/${id}/tex/upload`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                },
            );
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "upload failed");
            }
        }
        if (texFileInputRef.current) {
            texFileInputRef.current.value = "";
        }
        await fetchTexFiles();
    };

    const handleDeleteTexFile = async (path: string) => {
        if (!confirm(`"${path}" を削除しますか？`)) return;
        await apiDelete(
            `/api/v1/projects/${id}/tex/file?path=${encodeURIComponent(path)}`,
        );
        await fetchTexFiles();
        if (selectedTexPath === path) {
            setSelectedTexPath("main.tex");
            await loadTexFileContent("main.tex");
        }
    };

    const handleCompileTex = async () => {
        setIsCompiling(true);
        setCompileLog(null);
        try {
            await saveCurrentTexFile();
            const compiled = await apiPost<TexCompileResponse>(
                `/api/v1/projects/${id}/tex/compile`,
                { main_file: "main.tex" },
            );
            setCompileLog(compiled.log || null);
            await fetchTexPreview();
        } catch (e: unknown) {
            setCompileLog(e instanceof Error ? e.message : "コンパイル失敗");
        } finally {
            setIsCompiling(false);
        }
    };

    // ダイアログ内のフィルタリング（既に追加済みを除外 + 検索クエリ）
    const existingPaperIds = new Set(papers.map((p) => p.paper_id));
    const filteredLibraryPapers = libraryPapers.filter((p) => {
        if (existingPaperIds.has(p.id)) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.title.toLowerCase().includes(q) ||
            p.authors.some((a) => a.toLowerCase().includes(q))
        );
    });

    const isTextTexFile = (path: string) =>
        /\.(tex|bib|sty|cls|bst|txt)$/i.test(path);

    const fetchTexFiles = useCallback(async () => {
        setTexLoading(true);
        try {
            const filesRaw = await apiGet<
                Array<{
                    path: string;
                    size?: number | null;
                    content_type?: string | null;
                    updated_at?: string | null;
                }>
            >(`/api/v1/projects/${id}/tex/files`);
            const files: TexFileItem[] = filesRaw.map((f) => ({
                path: f.path,
                size: f.size ?? 0,
                contentType: f.content_type ?? "",
                updatedAt: f.updated_at ?? "",
            }));

            const hasMain = files.some((f) => f.path === "main.tex");
            if (!hasMain) {
                const title = project?.title || "My Project";
                const initialTex = `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\title{${title}}\n\\author{}\n\\date{}\n\n\\begin{document}\n\\maketitle\n\n\\section{Introduction}\n\n\\end{document}\n`;
                await apiPost(`/api/v1/projects/${id}/tex/file`, {
                    path: "main.tex",
                    content: initialTex,
                });
                files.push({
                    path: "main.tex",
                    size: initialTex.length,
                    contentType: "text/x-tex",
                    updatedAt: new Date().toISOString(),
                });
            }

            files.sort((a, b) => a.path.localeCompare(b.path));
            setTexFiles(files);
            if (!files.some((f) => f.path === selectedTexPath)) {
                setSelectedTexPath("main.tex");
            }
        } finally {
            setTexLoading(false);
        }
    }, [id, project?.title, selectedTexPath]);

    const loadTexFileContent = useCallback(
        async (path: string) => {
            if (!isTextTexFile(path)) return;
            const data = await apiGet<TexFileContentResponse>(
                `/api/v1/projects/${id}/tex/file?path=${encodeURIComponent(path)}`,
            );
            setLatexContent(data.content);
            return data.content;
        },
        [id],
    );

    const jumpToPaperInMainTex = useCallback(
        async (meta: { title: string; citeKey: string }) => {
            let content = latexContent;
            if (selectedTexPath !== "main.tex") {
                setSelectedTexPath("main.tex");
                const loaded = await loadTexFileContent("main.tex");
                if (typeof loaded === "string") {
                    content = loaded;
                }
            }
            const range = findPaperRangeInText(content, meta.title, meta.citeKey);
            if (!range) {
                alert("main.tex に該当箇所が見つかりませんでした。");
                return;
            }
            requestAnimationFrame(() => {
                focusEditorRange(range.start, range.end);
            });
        },
        [
            findPaperRangeInText,
            focusEditorRange,
            latexContent,
            loadTexFileContent,
            selectedTexPath,
        ],
    );

    const saveCurrentTexFile = useCallback(async () => {
        if (!isTextTexFile(selectedTexPath)) return;
        setTexSaving(true);
        try {
            await apiPost(`/api/v1/projects/${id}/tex/file`, {
                path: selectedTexPath,
                content: latexContent,
            });
            setLastSavedAt(new Date().toLocaleTimeString());
            await fetchTexFiles();
        } finally {
            setTexSaving(false);
        }
    }, [fetchTexFiles, id, latexContent, selectedTexPath]);

    const fetchTexPreview = useCallback(async () => {
        const data = await apiGet<TexCompileResponse>(
            `/api/v1/projects/${id}/tex/preview?main_file=${encodeURIComponent("main.tex")}`,
        );
        if (data.pdf_url) {
            if (pdfObjectUrlRef.current) {
                URL.revokeObjectURL(pdfObjectUrlRef.current);
                pdfObjectUrlRef.current = null;
            }
            setPdfPreviewUrl(withCacheBust(data.pdf_url));
            return;
        }

        const token = await auth?.currentUser?.getIdToken();
        if (!token) {
            setPdfPreviewUrl(null);
            return;
        }
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/projects/${id}/tex/preview/pdf?main_file=${encodeURIComponent("main.tex")}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        if (!res.ok) {
            setPdfPreviewUrl(null);
            return;
        }
        const blob = await res.blob();
        if (pdfObjectUrlRef.current) {
            URL.revokeObjectURL(pdfObjectUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(blob);
        pdfObjectUrlRef.current = objectUrl;
        setPdfPreviewUrl(objectUrl);
    }, [id]);

    useEffect(() => {
        return () => {
            if (pdfObjectUrlRef.current) {
                URL.revokeObjectURL(pdfObjectUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (activeTab !== "latex") return;

        fetchTexFiles().then(() => {
            void loadTexFileContent(selectedTexPath);
            void fetchTexPreview();
        });
    }, [
        activeTab,
        fetchTexFiles,
        fetchTexPreview,
        loadTexFileContent,
        selectedTexPath,
    ]);

    const paperMeta = useMemo(() => {
        return papers
            .map((paper) => {
                const detail = paperDetails.get(paper.paper_id);
                if (!detail) return null;
                return {
                    paperId: paper.paper_id,
                    title: detail.title,
                    citeKey: makeCiteKey(paper.paper_id),
                    year: detail.year,
                    authors: detail.authors,
                };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null);
    }, [papers, paperDetails]);

    const linkedPaperIds = useMemo(() => {
        const linked = new Set<string>();
        const citeMatches = Array.from(
            latexContent.matchAll(/\\cite\{([^}]*)\}/g),
            (m) => m[1] || "",
        );
        const citeKeysInDoc = new Set(
            citeMatches
                .flatMap((chunk) => chunk.split(","))
                .map((key) => key.trim())
                .filter(Boolean),
        );

        for (const meta of paperMeta) {
            if (
                meta.title &&
                latexContent.toLowerCase().includes(meta.title.toLowerCase())
            ) {
                linked.add(meta.paperId);
                continue;
            }
            if (citeKeysInDoc.has(meta.citeKey)) {
                linked.add(meta.paperId);
            }
        }
        return linked;
    }, [latexContent, paperMeta]);

    const titleMentionMatches = useMemo(() => {
        const matches: MentionMatch[] = [];
        for (const meta of paperMeta) {
            const title = meta.title?.trim();
            if (!title || title.length < 3) continue;
            const regex = new RegExp(escapeRegExp(title), "gi");
            for (const match of latexContent.matchAll(regex)) {
                const text = match[0];
                const start = match.index ?? -1;
                if (start < 0) continue;
                matches.push({
                    start,
                    end: start + text.length,
                    paperId: meta.paperId,
                    label: title,
                });
            }
        }
        return matches.sort((a, b) => a.start - b.start);
    }, [latexContent, paperMeta]);

    const docSearchMatches = useMemo(() => {
        const q = docSearchQuery.trim();
        if (!q) return [] as Array<{ start: number; end: number; preview: string }>;
        const regex = new RegExp(escapeRegExp(q), "gi");
        const hits: Array<{ start: number; end: number; preview: string }> = [];
        for (const match of latexContent.matchAll(regex)) {
            const start = match.index ?? -1;
            if (start < 0) continue;
            const end = start + match[0].length;
            const previewStart = Math.max(0, start - 24);
            const previewEnd = Math.min(latexContent.length, end + 24);
            hits.push({
                start,
                end,
                preview: latexContent.slice(previewStart, previewEnd).replace(/\n/g, " "),
            });
            if (hits.length >= 50) break;
        }
        return hits;
    }, [docSearchQuery, latexContent]);

    const bibtexText = useMemo(() => {
        if (papers.length === 0) return "論文がありません";
        return papers
            .map((p) => {
                const d = paperDetails.get(p.paper_id);
                if (!d) return "";
                const key = d.title
                    .split(" ")[0]
                    .toLowerCase()
                    .replace(/[^a-z]/g, "");
                return `@article{${key}${d.year || ""},\n  title={${d.title}},\n  author={${d.authors?.join(" and ") || ""}},\n  year={${d.year || ""}}\n}`;
            })
            .filter(Boolean)
            .join("\n\n");
    }, [paperDetails, papers]);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="glass-card rounded-xl p-6">
                    <div className="h-4 w-24 bg-muted/50 rounded mb-3" />
                    <div className="h-7 w-2/3 bg-muted/50 rounded mb-2" />
                    <div className="h-4 w-full bg-muted/30 rounded" />
                </div>
                <div className="h-10 w-full bg-muted/30 rounded-xl" />
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="glass-card rounded-xl p-4 h-20 bg-muted/20"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="space-y-6">
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                    <p className="text-red-400">
                        {error || "プロジェクトが見つかりません"}
                    </p>
                    <Link
                        href="/projects"
                        className="mt-2 inline-block text-sm text-primary hover:underline">
                        ← プロジェクト一覧に戻る
                    </Link>
                </div>
            </div>
        );
    }

    const tabs = [
        { key: "latex" as Tab, label: "LaTeX", count: linkedPaperIds.size },
        { key: "literature" as Tab, label: "プロジェクト内の文献", count: papers.length },
        { key: "memos" as Tab, label: "メモ", count: projectMemos.length },
    ];
    const filteredProjectMemos = projectMemos.filter((memo) => {
        if (!memoSearchQuery.trim()) return true;
        const q = memoSearchQuery.toLowerCase();
        return (
            memo.title.toLowerCase().includes(q) || memo.body.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            {/* プロジェクトヘッダー */}
            <div className="glass-card rounded-xl p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <Link
                            href="/projects"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            ← プロジェクト一覧
                        </Link>
                        <h2 className="mt-2 text-2xl font-bold">
                            {project.title}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {project.description}
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                    <span>{papers.length} 論文</span>
                </div>
            </div>

            {/* タブ */}
            <div className="flex gap-1 rounded-xl bg-muted/30 p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            activeTab === tab.key
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}>
                        {tab.label}
                        {tab.count !== null && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                    activeTab === tab.key
                                        ? "bg-primary/20 text-primary"
                                        : "bg-muted text-muted-foreground"
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* タブコンテンツ: LaTeX */}
            {activeTab === "latex" && (
                <div
                    className={`grid gap-4 ${
                        leftPanelMode === null
                            ? "xl:grid-cols-[40px_1fr_1fr]"
                            : "xl:grid-cols-[40px_260px_1fr_1fr]"
                    }`}>
                    <div className="glass-card rounded-xl p-2">
                        <div className="flex h-full flex-col items-center gap-2">
                            <button
                                onClick={() =>
                                    setLeftPanelMode((prev) =>
                                        prev === "files" ? null : "files",
                                    )
                                }
                                className={`rounded-md p-2 transition-colors ${
                                    leftPanelMode === "files"
                                        ? "bg-primary/20 text-primary"
                                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                }`}
                                title="Filesを開く">
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.8}
                                    stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 14.25v-9a2.25 2.25 0 00-2.25-2.25h-7.5L4.5 8.25v10.5A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25v-4.5z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9.75 3v5.25H4.5"
                                    />
                                </svg>
                            </button>
                            <button
                                onClick={() =>
                                    setLeftPanelMode((prev) =>
                                        prev === "search" ? null : "search",
                                    )
                                }
                                className={`rounded-md p-2 transition-colors ${
                                    leftPanelMode === "search"
                                        ? "bg-primary/20 text-primary"
                                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                }`}
                                title="検索を開く">
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.8}
                                    stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M21 21l-4.35-4.35m1.35-5.4a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {leftPanelMode === "files" && (
                        <div className="glass-card rounded-xl p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="font-semibold">Files</h4>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            texFileInputRef.current?.click()
                                        }
                                        className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                                        + Upload
                                    </button>
                                    <button
                                        onClick={() => setLeftPanelMode(null)}
                                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                                        閉じる
                                    </button>
                                </div>
                                <input
                                    ref={texFileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={handleUploadTexFiles}
                                />
                            </div>
                            <div className="space-y-1 max-h-[560px] overflow-auto">
                                {texLoading && (
                                    <p className="text-xs text-muted-foreground">
                                        読み込み中...
                                    </p>
                                )}
                                {!texLoading &&
                                    texFiles.map((f) => (
                                        <div
                                            key={f.path}
                                            className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                                                selectedTexPath === f.path
                                                    ? "bg-primary/15 text-primary"
                                                    : "hover:bg-muted/40 text-muted-foreground"
                                            }`}>
                                            <button
                                                className="min-w-0 flex-1 text-left truncate"
                                                onClick={() =>
                                                    void handleSelectTexFile(
                                                        f.path,
                                                    )
                                                }>
                                                {f.path}
                                            </button>
                                            <button
                                                className="opacity-0 group-hover:opacity-100 text-red-400"
                                                onClick={() =>
                                                    void handleDeleteTexFile(
                                                        f.path,
                                                    )
                                                }
                                                title="削除">
                                                ×
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                    {leftPanelMode === "search" && (
                        <div className="glass-card rounded-xl p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="font-semibold">検索</h4>
                                <button
                                    onClick={() => setLeftPanelMode(null)}
                                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                                    閉じる
                                </button>
                            </div>
                            <input
                                value={docSearchQuery}
                                onChange={(e) => setDocSearchQuery(e.target.value)}
                                placeholder="main.tex 内を検索..."
                                className="mb-3 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                            />
                            <div className="max-h-[520px] space-y-1 overflow-auto">
                                {docSearchQuery.trim() === "" && (
                                    <p className="text-xs text-muted-foreground">
                                        キーワードを入力してください。
                                    </p>
                                )}
                                {docSearchQuery.trim() !== "" &&
                                    docSearchMatches.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            該当箇所がありません。
                                        </p>
                                    )}
                                {docSearchMatches.map((m, idx) => (
                                    <button
                                        key={`${m.start}-${idx}`}
                                        onClick={() => focusEditorRange(m.start, m.end)}
                                        className="w-full rounded-md border border-border bg-muted/10 px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground">
                                        {m.preview}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="glass-card rounded-xl p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="font-semibold">
                                LaTeX Editor ({selectedTexPath})
                            </h4>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    {lastSavedAt
                                        ? `保存: ${lastSavedAt}`
                                        : "未保存"}
                                </span>
                                <button
                                    onClick={() => void saveCurrentTexFile()}
                                    disabled={
                                        texSaving ||
                                        !isTextTexFile(selectedTexPath)
                                    }
                                    className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50">
                                    {texSaving ? "保存中..." : "保存"}
                                </button>
                                <button
                                    onClick={() => void handleCompileTex()}
                                    disabled={isCompiling}
                                    className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500 hover:text-emerald-950 transition-colors disabled:opacity-50">
                                    {isCompiling
                                        ? "Compiling..."
                                        : "Compile PDF"}
                                </button>
                            </div>
                        </div>
                        {isTextTexFile(selectedTexPath) ? (
                            <textarea
                                ref={latexEditorRef}
                                value={latexContent}
                                onChange={(e) =>
                                    setLatexContent(e.target.value)
                                }
                                spellCheck={false}
                                className="h-[560px] w-full resize-y rounded-lg border border-border bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                placeholder="ここにLaTeXを書いてください..."
                            />
                        ) : (
                            <div className="h-[560px] rounded-lg border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                                このファイル形式はエディタ表示対象外です。
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="glass-card rounded-xl p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="font-semibold">PDF Preview</h4>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            setLogExpanded((prev) => !prev)
                                        }
                                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                                        {logExpanded ? "Log ▲" : "Log ▼"}
                                    </button>
                                    <button
                                        onClick={() => void fetchTexPreview()}
                                        className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
                                        title="PDFを再読み込み"
                                        aria-label="PDFを再読み込み">
                                        <RotateCw className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {pdfPreviewUrl ? (
                                <iframe
                                    src={pdfPreviewUrl}
                                    className="h-[520px] w-full rounded-lg border border-border bg-background"
                                    title="TeX PDF Preview"
                                />
                            ) : (
                                <div className="h-[520px] flex items-center justify-center rounded-lg border border-border bg-muted/10 text-xs text-muted-foreground">
                                    まだPDFが生成されていません。Compile PDF
                                    を押してください。
                                </div>
                            )}
                            {logExpanded && (
                                <div className="mt-2">
                                    {compileLog ? (
                                        <pre className="max-h-36 overflow-auto rounded bg-background p-2 text-[10px] text-muted-foreground">
                                            {compileLog}
                                        </pre>
                                    ) : (
                                        <p className="rounded bg-background p-2 text-[11px] text-muted-foreground">
                                            ログはまだありません。
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="glass-card rounded-xl p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="font-semibold">
                                    プロジェクト内の文献
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        Linked {linkedPaperIds.size}/{papers.length}
                                    </span>
                                    <button
                                        onClick={openAddDialog}
                                        className="rounded-lg border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
                                        + 論文を追加
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {paperMeta.map((meta) => {
                                    const isLinked = linkedPaperIds.has(
                                        meta.paperId,
                                    );
                                    const firstMatch = titleMentionMatches.find(
                                        (m) => m.paperId === meta.paperId,
                                    );
                                    return (
                                        <div
                                            key={meta.paperId}
                                            className={`rounded-lg border p-2 text-xs ${
                                                isLinked
                                                    ? "border-emerald-500/40 bg-emerald-500/10"
                                                    : "border-border bg-muted/10"
                                            }`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    onClick={() =>
                                                        void jumpToPaperInMainTex(meta)
                                                    }
                                                    className="truncate text-left hover:text-primary"
                                                    title="main.tex の該当箇所へジャンプ">
                                                    {meta.title}
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    <Link
                                                        href={`/papers/${meta.paperId}`}
                                                        className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                                                        paper
                                                    </Link>
                                                    {firstMatch && (
                                                        <button
                                                            onClick={() =>
                                                                focusEditorRange(
                                                                    firstMatch.start,
                                                                    firstMatch.end,
                                                                )
                                                            }
                                                            className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                                                            jump
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            insertCitationAtCursor(
                                                                meta.citeKey,
                                                            )
                                                        }
                                                        className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary hover:text-primary-foreground">
                                                        cite
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* タブコンテンツ: プロジェクト内の文献 */}
            {activeTab === "literature" && (
                <div className="space-y-4">
                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold">BibTeX Export</h4>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            bibtexText,
                                        );
                                        alert("BibTeXをコピーしました");
                                    }}
                                    className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
                                    title="BibTeXをコピー"
                                    aria-label="BibTeXをコピー">
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.8}
                                        stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M8.25 7.5V5.625c0-.621.504-1.125 1.125-1.125h8.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125H15.75"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6.375 8.25h8.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-8.25A1.125 1.125 0 015.25 17.625v-8.25c0-.621.504-1.125 1.125-1.125z"
                                        />
                                    </svg>
                                </button>
                                <button
                                    onClick={() =>
                                        setBibtexExpanded((prev) => !prev)
                                    }
                                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                                    {bibtexExpanded ? "閉じる ▲" : "開く ▼"}
                                </button>
                            </div>
                        </div>
                        {bibtexExpanded && (
                            <div className="mt-4">
                                <pre className="rounded-lg bg-background p-4 text-xs text-muted-foreground overflow-x-auto font-mono whitespace-pre-wrap">
                                    {bibtexText}
                                </pre>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        {paperMeta.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <div className="text-4xl mb-3">📚</div>
                                <p>プロジェクト内の文献はまだありません</p>
                            </div>
                        )}
                        {paperMeta.map((meta) => {
                            const detail = paperDetails.get(meta.paperId);
                            return (
                                <Link
                                    key={meta.paperId}
                                    href={`/papers/${meta.paperId}`}
                                    className="glass-card group flex items-center gap-3 rounded-xl p-3 transition-all hover:border-primary/40">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                                        {detail?.year?.toString().slice(-2) || "??"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {meta.title}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {detail?.authors.join(", ") || "Author不明"}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* タブコンテンツ: メモ */}
            {activeTab === "memos" && (
                <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                    <div className="glass-card rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold">メモ一覧</h4>
                            <button
                                onClick={resetMemoEditor}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                                新規メモ
                            </button>
                        </div>
                        <div className="relative">
                            <svg
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                                />
                            </svg>
                            <input
                                value={memoSearchQuery}
                                onChange={(e) => setMemoSearchQuery(e.target.value)}
                                placeholder="メモを検索..."
                                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/40"
                            />
                        </div>
                        <div className="max-h-[580px] space-y-2 overflow-y-auto pr-1">
                            {memosLoading && (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    読み込み中...
                                </p>
                            )}
                            {!memosLoading && filteredProjectMemos.length === 0 && (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    プロジェクトメモはまだありません
                                </p>
                            )}
                            {!memosLoading &&
                                filteredProjectMemos.map((memo) => {
                                    const updatedAt = memo.updated_at || memo.created_at;
                                    return (
                                        <button
                                            key={memo.id}
                                            onClick={() => openMemoEditor(memo)}
                                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                                                editingMemoId === memo.id
                                                    ? "border-primary/40 bg-primary/5"
                                                    : "border-border hover:border-primary/30"
                                            }`}>
                                            <p className="line-clamp-1 text-sm font-medium">
                                                {memo.title || "無題のメモ"}
                                            </p>
                                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                {memo.body || "(本文なし)"}
                                            </p>
                                            <p className="mt-2 text-[11px] text-muted-foreground">
                                                {updatedAt
                                                    ? new Date(updatedAt).toLocaleString("ja-JP")
                                                    : ""}
                                            </p>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="glass-card rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold">
                                {editingMemoId ? "メモを編集" : "新しいメモ"}
                            </h4>
                            {editingMemoId && (
                                <button
                                    onClick={() => handleDeleteMemo(editingMemoId)}
                                    className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20">
                                    削除
                                </button>
                            )}
                        </div>
                        <input
                            value={memoTitle}
                            onChange={(e) => setMemoTitle(e.target.value)}
                            placeholder="タイトル"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
                        />
                        <textarea
                            value={memoBody}
                            onChange={(e) => setMemoBody(e.target.value)}
                            placeholder="このプロジェクトに関するメモを記録..."
                            rows={16}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={resetMemoEditor}
                                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                                クリア
                            </button>
                            <button
                                onClick={handleSaveMemo}
                                disabled={memoSaving}
                                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                                {memoSaving ? "保存中..." : "保存"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 論文追加ダイアログ */}
            {showAddDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-lg rounded-2xl p-6 mx-4 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                論文を追加
                            </h3>
                            <button
                                onClick={() => setShowAddDialog(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors">
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* 検索フィールド */}
                        <div className="relative mb-4">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor">
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
                                placeholder="マイライブラリから検索..."
                                className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* 論文リスト */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                            {libraryLoading && (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="rounded-xl bg-muted/20 p-4 animate-pulse">
                                            <div className="h-4 w-3/4 bg-muted/50 rounded mb-2" />
                                            <div className="h-3 w-1/2 bg-muted/30 rounded" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!libraryLoading &&
                                filteredLibraryPapers.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <div className="text-3xl mb-2">📚</div>
                                        <p className="text-sm">
                                            {libraryPapers.length === 0
                                                ? "マイライブラリに論文がありません"
                                                : searchQuery
                                                  ? "該当する論文が見つかりません"
                                                  : "すべての論文が追加済みです"}
                                        </p>
                                    </div>
                                )}

                            {!libraryLoading &&
                                filteredLibraryPapers.map((paper) => (
                                    <div
                                        key={paper.id}
                                        className="group flex items-center gap-3 rounded-xl border border-border bg-muted/10 p-3 transition-all hover:border-primary/30 hover:bg-muted/20">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                                            {paper.year?.toString().slice(-2) ||
                                                "??"}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-medium truncate">
                                                {paper.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {paper.authors.join(", ")}{" "}
                                                {paper.venue &&
                                                    `· ${paper.venue}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                handleAddPaper(paper)
                                            }
                                            disabled={
                                                addingPaperId === paper.id
                                            }
                                            className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary
                        hover:bg-primary hover:text-primary-foreground
                        transition-all active:scale-95 disabled:opacity-50">
                                            {addingPaperId === paper.id
                                                ? "追加中..."
                                                : "追加"}
                                        </button>
                                    </div>
                                ))}
                        </div>

                        {/* フッター: 論文検索へ */}
                        <div className="mt-4 pt-4 border-t border-border">
                            <Link
                                href="/search"
                                onClick={() => setShowAddDialog(false)}
                                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                                    />
                                </svg>
                                論文を検索して追加する →
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
