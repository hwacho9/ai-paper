"use client";

/**
 * マイライブラリ — いいね済み論文一覧
 * グリッド/リスト切替 + ソート + フィルター
 */

import { useState } from "react";
import Link from "next/link";

type ViewMode = "grid" | "list";

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

const papers = [
  {
    id: "1",
    title: "Attention Is All You Need",
    authors: ["Vaswani, A.", "Shazeer, N."],
    year: 2017,
    venue: "NeurIPS",
    status: "READY",
    keywords: ["Transformer", "Self-Attention"],
  },
  {
    id: "2",
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: ["Devlin, J.", "Chang, M."],
    year: 2019,
    venue: "NAACL",
    status: "READY",
    keywords: ["BERT", "NLP"],
  },
  {
    id: "3",
    title: "Language Models are Few-Shot Learners",
    authors: ["Brown, T.", "Mann, B."],
    year: 2020,
    venue: "NeurIPS",
    status: "INGESTING",
    keywords: ["GPT-3", "Few-Shot"],
  },
  {
    id: "4",
    title: "An Image is Worth 16x16 Words: ViT",
    authors: ["Dosovitskiy, A."],
    year: 2021,
    venue: "ICLR",
    status: "READY",
    keywords: ["ViT", "Vision"],
  },
  {
    id: "5",
    title: "Scaling Laws for Neural Language Models",
    authors: ["Kaplan, J.", "McCandlish, S."],
    year: 2020,
    venue: "arXiv",
    status: "READY",
    keywords: ["Scaling", "LLM"],
  },
  {
    id: "6",
    title: "Constitutional AI",
    authors: ["Bai, Y.", "Kadavath, S."],
    year: 2022,
    venue: "arXiv",
    status: "PENDING",
    keywords: ["RLHF", "Safety"],
  },
];

export default function LibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">マイライブラリ</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {papers.length} 論文
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* ビュー切替 */}
          <div className="flex rounded-lg border border-border bg-muted/30">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-l-lg p-2 transition-colors ${viewMode === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
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
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-r-lg p-2 transition-colors ${viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
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
                  d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* フィルターバー */}
      <div className="flex flex-wrap gap-2">
        {["すべて", "READY", "処理中", "キーワード付き"].map((f, i) => (
          <button
            key={f}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              i === 0
                ? "bg-primary/20 text-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* グリッドビュー */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {papers.map((paper) => (
            <Link key={paper.id} href={`/papers/${paper.id}`}>
              <div className="glass-card group h-full rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] hover:border-primary/30 hover:glow">
                <div className="flex items-start justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[paper.status]}`}
                  >
                    {statusLabels[paper.status]}
                  </span>
                  <button className="text-red-400 transition-transform hover:scale-110">
                    ❤️
                  </button>
                </div>
                <h3 className="mt-3 font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {paper.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground truncate">
                  {paper.authors.join(", ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {paper.venue} {paper.year}
                </p>
                {paper.keywords.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {paper.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* リストビュー */
        <div className="space-y-2">
          {papers.map((paper) => (
            <Link key={paper.id} href={`/papers/${paper.id}`}>
              <div className="glass-card group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:border-primary/30">
                <button className="text-red-400 text-sm">❤️</button>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium group-hover:text-primary transition-colors truncate">
                    {paper.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {paper.authors.join(", ")} · {paper.venue} {paper.year}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[paper.status]}`}
                >
                  {statusLabels[paper.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
