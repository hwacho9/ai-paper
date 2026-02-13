"use client";

/**
 * ダッシュボードページ
 * 統計カード + 最近の論文 + プロジェクト + メモ
 * すべてのデータをAPIから取得
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";

/* ---------- 型定義 ---------- */

interface DashboardProject {
  id: string;
  title: string;
  paper_count: number;
  updated_at: string | null;
}

interface ProjectListResponse {
  projects: DashboardProject[];
  total: number;
}

interface PaperItem {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  status: string;
}

interface PaperListResponse {
  papers: PaperItem[];
  total: number;
}

/* ---------- ユーティリティ ---------- */

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

const statusColors: Record<string, string> = {
  READY: "bg-emerald-500/20 text-emerald-400",
  INGESTING: "bg-amber-500/20 text-amber-400",
  PENDING: "bg-gray-500/20 text-gray-400",
  FAILED: "bg-red-500/20 text-red-400",
};

const statusLabels: Record<string, string> = {
  READY: "完了",
  INGESTING: "処理中",
  PENDING: "保留",
  FAILED: "失敗",
};

/* ---------- コンポーネント ---------- */

export default function DashboardPage() {
  const [recentProjects, setRecentProjects] = useState<DashboardProject[]>([]);
  const [recentPapers, setRecentPapers] = useState<PaperItem[]>([]);
  const [stats, setStats] = useState([
    { label: "保存済み論文", value: "-", change: "", icon: "📄" },
    { label: "プロジェクト", value: "-", change: "", icon: "📁" },
    { label: "メモ", value: "-", change: "", icon: "✏️" },
    { label: "検索回数", value: "-", change: "", icon: "🔍" },
  ]);

  useEffect(() => {
    // プロジェクト一覧
    apiGet<ProjectListResponse>("/api/v1/projects")
      .then((data) => {
        setRecentProjects(data.projects.slice(0, 3));
        const activeCount = data.projects.length;
        setStats((prev) =>
          prev.map((s) =>
            s.label === "プロジェクト"
              ? {
                  ...s,
                  value: String(data.total),
                  change: `${activeCount} アクティブ`,
                }
              : s,
          ),
        );
      })
      .catch(() => setRecentProjects([]));

    // 論文ライブラリ
    apiGet<PaperListResponse>("/api/v1/library")
      .then((data) => {
        setRecentPapers(data.papers.slice(0, 3));
        setStats((prev) =>
          prev.map((s) =>
            s.label === "保存済み論文"
              ? { ...s, value: String(data.total) }
              : s,
          ),
        );
      })
      .catch(() => setRecentPapers([]));
  }, []);

  return (
    <div className="space-y-8">
      {/* ウェルカムセクション */}
      <div>
        <h2 className="text-2xl font-bold">おかえりなさい 👋</h2>
        <p className="mt-1 text-muted-foreground">
          研究の進捗を確認しましょう。
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:glow"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-xs text-muted-foreground">
                {stat.change}
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* メインコンテンツ 2カラム */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 最近の論文 (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">最近の論文</h3>
            <Link
              href="/library"
              className="text-sm text-primary hover:underline"
            >
              すべて表示 →
            </Link>
          </div>
          <div className="space-y-3">
            {recentPapers.length === 0 && (
              <div className="glass-card rounded-xl p-6 text-center text-muted-foreground text-sm">
                まだ論文が保存されていません。検索から論文を追加しましょう。
              </div>
            )}
            {recentPapers.map((paper) => (
              <Link key={paper.id} href={`/papers/${paper.id}`}>
                <div className="group glass-card rounded-xl p-4 transition-all duration-200 hover:scale-[1.01] hover:border-primary/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium leading-snug group-hover:text-primary transition-colors">
                        {paper.title}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground truncate">
                        {paper.authors.join(", ")}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {paper.venue} {paper.year}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            statusColors[paper.status] || statusColors.PENDING
                          }`}
                        >
                          {statusLabels[paper.status] || paper.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* サイドパネル (1/3) */}
        <div className="space-y-6">
          {/* プロジェクト */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">プロジェクト</h3>
              <Link
                href="/projects"
                className="text-sm text-primary hover:underline"
              >
                すべて →
              </Link>
            </div>
            <div className="space-y-2">
              {recentProjects.length === 0 && (
                <div className="glass-card rounded-xl p-4 text-center text-muted-foreground text-sm">
                  プロジェクトがありません
                </div>
              )}
              {recentProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="glass-card rounded-xl p-4 transition-all duration-200 hover:border-primary/30">
                    <h4 className="font-medium">{project.title}</h4>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project.paper_count} 論文</span>
                      <span>{formatRelativeTime(project.updated_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* クイックアクション */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">クイックアクション</h3>
            <div className="space-y-2">
              <Link
                href="/search"
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm transition-all hover:bg-muted/60 hover:border-primary/30"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  🔍
                </span>
                <span>新しい論文を検索</span>
              </Link>
              <Link
                href="/projects"
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm transition-all hover:bg-muted/60 hover:border-primary/30"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  📁
                </span>
                <span>プロジェクトを作成</span>
              </Link>
              <Link
                href="/memos"
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm transition-all hover:bg-muted/60 hover:border-primary/30"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  ✏️
                </span>
                <span>メモを書く</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
