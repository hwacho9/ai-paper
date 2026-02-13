"use client";

/**
 * プロジェクト詳細ページ
 * Firestore からプロジェクトデータを取得して表示
 * タブ切替: 参照論文 / メモ / BibTeX Export
 */

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { apiGet, apiDelete } from "@/lib/api/client";

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
          // 論文詳細が取得できなくても続行
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
          <button className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 transition-colors">
            <svg
              className="h-4 w-4 inline mr-1"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
            </svg>
            設定
          </button>
        </div>
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          <span>{papers.length} 論文</span>
          <span>ID: {id}</span>
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
              <div
                key={paper.paper_id}
                className="glass-card group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:border-primary/30"
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
              </div>
            );
          })}
          <button className="w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
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
                // 簡易BibTeX生成
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
    </div>
  );
}
