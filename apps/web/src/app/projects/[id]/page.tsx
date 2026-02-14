"use client";

/**
 * プロジェクト詳細ページ
 * Firestore からプロジェクトデータを取得して表示
 * タブ切替: 参照論文 / メモ / BibTeX Export
 */

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";

type Tab = "papers" | "memos" | "export";

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

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("papers");
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

  const fetchProject = useCallback(async () => {
    try {
      setError(null);
      const [projectData, papersData] = await Promise.all([
        apiGet<Project>(`/api/v1/projects/${id}`),
        apiGet<ProjectPaper[]>(`/api/v1/projects/${id}/papers`),
      ]);
      setProject(projectData);
      setPapers(papersData);

      // 論文の詳細を取得（papers コレクションから）
      const details = new Map<string, PaperDetail>();
      for (const paper of papersData) {
        try {
          const detail = await apiGet<PaperDetail>(
            `/api/v1/library/${paper.paper_id}`,
          );
          details.set(paper.paper_id, detail);
        } catch {
          details.set(paper.paper_id, {
            id: paper.paper_id,
            title: paper.paper_id,
            authors: [],
            year: null,
            venue: "",
            abstract: "",
          });
        }
      }
      setPaperDetails(details);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "プロジェクトの取得に失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleRemovePaper = async (paperId: string) => {
    if (!confirm("この論文をプロジェクトから削除しますか？")) return;
    try {
      await apiDelete(`/api/v1/projects/${id}/papers/${paperId}`);
      setPapers((prev) => prev.filter((p) => p.paper_id !== paperId));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "削除に失敗しました";
      alert(message);
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
      const message = e instanceof Error ? e.message : "追加に失敗しました";
      alert(message);
    } finally {
      setAddingPaperId(null);
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
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            ← プロジェクト一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "papers" as Tab, label: "参照論文", count: papers.length },
    { key: "memos" as Tab, label: "メモ", count: null },
    { key: "export" as Tab, label: "BibTeX Export", count: null },
  ];

  return (
    <div className="space-y-6">
      {/* プロジェクトヘッダー */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/projects"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← プロジェクト一覧
            </Link>
            <h2 className="mt-2 text-2xl font-bold">{project.title}</h2>
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
            }`}
          >
            {tab.label}
            {tab.count !== null && (
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

      {/* タブコンテンツ: 参照論文 */}
      {activeTab === "papers" && (
        <div className="space-y-3">
          {papers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">📄</div>
              <p>まだ論文が追加されていません</p>
            </div>
          )}
          {papers.map((paper) => {
            const detail = paperDetails.get(paper.paper_id);
            return (
              <Link
                key={paper.paper_id}
                href={`/papers/${paper.paper_id}`}
                className="glass-card group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                  {detail?.year?.toString().slice(-2) || "??"}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium group-hover:text-primary transition-colors truncate">
                    {detail?.title || paper.paper_id}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {detail?.authors?.join(", ") || ""}{" "}
                    {detail?.venue && `· ${detail.venue}`}{" "}
                    {detail?.year && detail.year}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemovePaper(paper.paper_id);
                  }}
                  className="text-muted-foreground/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="削除"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </Link>
            );
          })}
          <button
            onClick={openAddDialog}
            className="w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
          >
            + 論文を追加
          </button>
        </div>
      )}

      {/* タブコンテンツ: メモ */}
      {activeTab === "memos" && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">✏️</div>
          <p>メモ機能は準備中です</p>
        </div>
      )}

      {/* タブコンテンツ: BibTeX Export */}
      {activeTab === "export" && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">BibTeX</h4>
            <button
              onClick={() => {
                const bibtex = papers
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
                navigator.clipboard.writeText(bibtex);
                alert("BibTeXをコピーしました");
              }}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
            >
              コピー
            </button>
          </div>
          <pre className="rounded-lg bg-background p-4 text-xs text-muted-foreground overflow-x-auto font-mono whitespace-pre-wrap">
            {papers.length === 0
              ? "論文がありません"
              : papers
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
                  .join("\n\n")}
          </pre>
        </div>
      )}

      {/* 論文追加ダイアログ */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg rounded-2xl p-6 mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">論文を追加</h3>
              <button
                onClick={() => setShowAddDialog(false)}
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

            {/* 検索フィールド */}
            <div className="relative mb-4">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
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
                      className="rounded-xl bg-muted/20 p-4 animate-pulse"
                    >
                      <div className="h-4 w-3/4 bg-muted/50 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-muted/30 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {!libraryLoading && filteredLibraryPapers.length === 0 && (
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
                    className="group flex items-center gap-3 rounded-xl border border-border bg-muted/10 p-3 transition-all hover:border-primary/30 hover:bg-muted/20"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                      {paper.year?.toString().slice(-2) || "??"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium truncate">
                        {paper.title}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {paper.authors.join(", ")}{" "}
                        {paper.venue && `· ${paper.venue}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddPaper(paper)}
                      disabled={addingPaperId === paper.id}
                      className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary
                        hover:bg-primary hover:text-primary-foreground
                        transition-all active:scale-95 disabled:opacity-50"
                    >
                      {addingPaperId === paper.id ? "追加中..." : "追加"}
                    </button>
                  </div>
                ))}
            </div>

            {/* フッター: 論文検索へ */}
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href="/search"
                onClick={() => setShowAddDialog(false)}
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
