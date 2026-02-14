"use client";

/**
 * ダッシュボードページ
 * 統計カード + 最近の論文 + プロジェクト + メモ
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import { getLibrary, PaperResponse } from "@/lib/api";
import { getMemos, MemoResponse } from "@/lib/api";

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

export default function DashboardPage() {
  const [recentProjects, setRecentProjects] = useState<DashboardProject[]>([]);
  const [recentPapers, setRecentPapers] = useState<PaperResponse[]>([]);
  const [recentMemos, setRecentMemos] = useState<MemoResponse[]>([]);
  const [paperCount, setPaperCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [memoCount, setMemoCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [libraryData, projectData, memoData] = await Promise.allSettled([
          getLibrary(),
          apiGet<ProjectListResponse>("/api/v1/projects"),
          getMemos(),
        ]);

        // 論文データ
        if (libraryData.status === "fulfilled") {
          const papers = libraryData.value.papers;
          setPaperCount(libraryData.value.total);
          // 最新3件（updated_atまたはcreated_atで降順ソート）
          const sorted = [...papers].sort((a, b) => {
            const dateA = new Date(
              a.updated_at || a.created_at || "",
            ).getTime();
            const dateB = new Date(
              b.updated_at || b.created_at || "",
            ).getTime();
            return dateB - dateA;
          });
          setRecentPapers(sorted.slice(0, 3));
        }

        // プロジェクトデータ
        if (projectData.status === "fulfilled") {
          setProjectCount(projectData.value.total);
          setRecentProjects(projectData.value.projects.slice(0, 3));
        }

        // メモデータ
        if (memoData.status === "fulfilled") {
          setMemoCount(memoData.value.total);
          const sorted = [...memoData.value.memos].sort((a, b) => {
            const dateA = new Date(
              a.updated_at || a.created_at || "",
            ).getTime();
            const dateB = new Date(
              b.updated_at || b.created_at || "",
            ).getTime();
            return dateB - dateA;
          });
          setRecentMemos(sorted.slice(0, 3));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    { label: "保存済み論文", value: paperCount, icon: "📄", href: "/library" },
    {
      label: "プロジェクト",
      value: projectCount,
      icon: "📁",
      href: "/projects",
    },
    { label: "メモ", value: memoCount, icon: "✏️", href: "/memos" },
  ];

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="glass-card rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:glow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            {loading ? (
              <div className="mt-3 h-9 w-16 animate-pulse rounded bg-muted/50" />
            ) : (
              <p className="mt-3 text-3xl font-bold">{stat.value}</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </Link>
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
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="glass-card rounded-xl p-4 animate-pulse"
                >
                  <div className="h-5 w-3/4 rounded bg-muted/50 mb-2" />
                  <div className="h-4 w-1/2 rounded bg-muted/30 mb-2" />
                  <div className="h-3 w-1/4 rounded bg-muted/20" />
                </div>
              ))
            ) : recentPapers.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-muted-foreground">
                  まだ論文がありません。
                  <Link
                    href="/search"
                    className="text-primary hover:underline ml-1"
                  >
                    論文を検索
                  </Link>
                  して追加しましょう。
                </p>
              </div>
            ) : (
              recentPapers.map((paper) => (
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
                      <span className="mt-1 text-lg">
                        {paper.is_liked ? "❤️" : "🤍"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
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
              {loading ? (
                [...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="glass-card rounded-xl p-4 animate-pulse"
                  >
                    <div className="h-4 w-2/3 rounded bg-muted/50 mb-2" />
                    <div className="h-3 w-1/3 rounded bg-muted/30" />
                  </div>
                ))
              ) : recentProjects.length === 0 ? (
                <div className="glass-card rounded-xl p-4 text-center text-sm text-muted-foreground">
                  まだプロジェクトがありません
                </div>
              ) : (
                recentProjects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="glass-card rounded-xl p-4 transition-all duration-200 hover:border-primary/30">
                      <h4 className="font-medium">{project.title}</h4>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{project.paper_count} 論文</span>
                        <span>{formatRelativeTime(project.updated_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* 最近のメモ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">最近のメモ</h3>
              <Link
                href="/memos"
                className="text-sm text-primary hover:underline"
              >
                すべて →
              </Link>
            </div>
            <div className="space-y-2">
              {loading ? (
                [...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="glass-card rounded-xl p-4 animate-pulse"
                  >
                    <div className="h-4 w-2/3 rounded bg-muted/50 mb-2" />
                    <div className="h-3 w-full rounded bg-muted/20" />
                  </div>
                ))
              ) : recentMemos.length === 0 ? (
                <div className="glass-card rounded-xl p-4 text-center text-sm text-muted-foreground">
                  まだメモがありません
                </div>
              ) : (
                recentMemos.map((memo) => (
                  <div
                    key={memo.id}
                    className="glass-card rounded-xl p-4 transition-all duration-200 hover:border-primary/30"
                  >
                    <h4 className="font-medium text-sm truncate">
                      {memo.title || "無題のメモ"}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {memo.body || "内容なし"}
                    </p>
                    <div className="mt-1 text-[10px] text-muted-foreground/60">
                      {formatRelativeTime(memo.updated_at)}
                    </div>
                  </div>
                ))
              )}
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
