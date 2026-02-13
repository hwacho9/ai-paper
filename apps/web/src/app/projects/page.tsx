"use client";

/**
 * プロジェクト一覧ページ
 * プロジェクトカードグリッド + 新規作成
 */

import { useState } from "react";
import Link from "next/link";

const projects = [
  {
    id: "1",
    title: "Transformer Survey",
    description:
      "Transformer系アーキテクチャの進化と応用に関するサーベイ論文プロジェクト",
    paperCount: 8,
    memoCount: 12,
    createdAt: "2024-01-15",
    updatedAt: "2時間前",
    color: "from-blue-500/20 to-indigo-500/20",
  },
  {
    id: "2",
    title: "Few-shot Learning研究",
    description: "少数サンプル学習の最新手法を整理・比較するプロジェクト",
    paperCount: 12,
    memoCount: 5,
    createdAt: "2024-02-01",
    updatedAt: "昨日",
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    id: "3",
    title: "Vision-Language Models",
    description: "視覚と言語のマルチモーダルモデルの最新動向",
    paperCount: 6,
    memoCount: 3,
    createdAt: "2024-02-10",
    updatedAt: "3日前",
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    id: "4",
    title: "Efficient Inference",
    description: "LLMの高速推論技術（量子化・蒸留・スパース化）",
    paperCount: 15,
    memoCount: 8,
    createdAt: "2024-01-20",
    updatedAt: "1週間前",
    color: "from-amber-500/20 to-orange-500/20",
  },
];

export default function ProjectsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">マイプロジェクト</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} プロジェクト
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

      {/* プロジェクトグリッド */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <div className="glass-card group h-full rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 hover:glow">
              {/* カラーバー */}
              <div
                className={`h-1.5 w-full bg-gradient-to-r ${project.color}`}
              />
              <div className="p-5">
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
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
                    {project.paperCount} 論文
                  </span>
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
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                    {project.memoCount} メモ
                  </span>
                  <span className="ml-auto">{project.updatedAt}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 新規作成ダイアログ（簡易版） */}
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
                  placeholder="例: Transformer Survey"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  説明
                </label>
                <textarea
                  placeholder="プロジェクトの概要を入力..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
