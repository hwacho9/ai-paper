"use client";

/**
 * プロジェクト一覧ページ
 * Firestore からプロジェクトを取得して表示 + 新規作成 + 削除
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";

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

interface ProjectListResponse {
  projects: Project[];
  total: number;
}

const colorPalette = [
  "from-blue-500/20 to-indigo-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-purple-500/20 to-pink-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-rose-500/20 to-red-500/20",
  "from-cyan-500/20 to-sky-500/20",
];

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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGet<ProjectListResponse>("/api/v1/projects");
      setProjects(data.projects);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "プロジェクトの取得に失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await apiPost("/api/v1/projects", {
        title: newTitle.trim(),
        description: newDescription.trim(),
      });
      setShowCreateDialog(false);
      setNewTitle("");
      setNewDescription("");
      await fetchProjects();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "作成に失敗しました";
      alert(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (
      !confirm(
        "本当にこのプロジェクトを削除しますか？\n（含まれる論文データは削除されません）",
      )
    )
      return;

    try {
      await apiDelete(`/api/v1/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "削除に失敗しました";
      alert(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">マイプロジェクト</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "読み込み中..." : `${projects.length} プロジェクト`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
            transition-all hover:bg-primary/90 active:scale-95"
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
          新規作成
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
          <button
            onClick={fetchProjects}
            className="ml-2 underline hover:text-red-300"
          >
            再試行
          </button>
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="glass-card rounded-xl overflow-hidden animate-pulse"
            >
              <div className="h-1.5 w-full bg-muted/50" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-2/3 bg-muted/50 rounded" />
                <div className="h-4 w-full bg-muted/30 rounded" />
                <div className="flex gap-4">
                  <div className="h-3 w-16 bg-muted/30 rounded" />
                  <div className="h-3 w-16 bg-muted/30 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* プロジェクトグリッド */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block h-full"
            >
              <div className="glass-card group relative h-full rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 hover:glow flex flex-col">
                {/* 削除ボタン (ホバー時に表示) */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                  className="absolute top-3 right-3 z-10 rounded-lg bg-background/80 p-2 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-all
                    hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                  title="プロジェクトを削除"
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
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>

                {/* カラーバー */}
                <div
                  className={`h-1.5 w-full bg-gradient-to-r ${colorPalette[index % colorPalette.length]}`}
                />

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors pr-8">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">
                    {project.description || "説明なし"}
                  </p>
                  <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-4">
                    <span className="flex items-center gap-1.5">
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
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                      {project.paper_count} 論文
                    </span>
                    <span>{formatRelativeTime(project.updated_at)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 空状態 */}
      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">📁</div>
          <h3 className="text-lg font-semibold">
            プロジェクトがまだありません
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            新しいプロジェクトを作成して、論文を整理しましょう。
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
              transition-all hover:bg-primary/90 active:scale-95"
          >
            最初のプロジェクトを作成
          </button>
        </div>
      )}

      {/* 新規作成ダイアログ */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 mx-4">
            <h3 className="text-lg font-semibold">新規プロジェクト作成</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  プロジェクト名
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例: Transformer Survey"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  説明
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="プロジェクトの概要を入力..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewTitle("");
                  setNewDescription("");
                }}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={creating}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
              >
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
