"use client";

/**
 * 論文検索ページ
 * 検索フォーム + フィルター + 結果グリッド
 */

import { useState } from "react";

const mockResults = [
  {
    externalId: "1",
    title: "Attention Is All You Need",
    authors: ["Vaswani, A.", "Shazeer, N.", "Parmar, N.", "Uszkoreit, J."],
    year: 2017,
    venue: "NeurIPS",
    abstract:
      "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer...",
    citationCount: 95000,
    isInLibrary: true,
  },
  {
    externalId: "2",
    title:
      "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: ["Devlin, J.", "Chang, M.", "Lee, K.", "Toutanova, K."],
    year: 2019,
    venue: "NAACL",
    abstract:
      "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers...",
    citationCount: 72000,
    isInLibrary: false,
  },
  {
    externalId: "3",
    title: "Language Models are Few-Shot Learners (GPT-3)",
    authors: ["Brown, T.", "Mann, B.", "Ryder, N.", "Subbiah, M."],
    year: 2020,
    venue: "NeurIPS",
    abstract:
      "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning...",
    citationCount: 28000,
    isInLibrary: false,
  },
  {
    externalId: "4",
    title:
      "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    authors: ["Dosovitskiy, A.", "Beyer, L.", "Kolesnikov, A."],
    year: 2021,
    venue: "ICLR",
    abstract:
      "While the Transformer architecture has become the de-facto standard for natural language processing tasks, its applications to computer vision remain limited...",
    citationCount: 32000,
    isInLibrary: true,
  },
];

function formatCitations(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setHasSearched(true);
  };

  return (
    <div className="space-y-6">
      {/* 検索ヘッダー */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          <span className="gradient-text">論文を検索</span>
        </h2>
        <p className="mt-2 text-muted-foreground">
          Semantic Scholar から数千万件の論文を検索できます
        </p>
      </div>

      {/* 検索フォーム */}
      <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワード、タイトル、著者名..."
            className="w-full rounded-xl border border-border bg-card py-3.5 pl-12 pr-4 text-base outline-none
              transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground
              transition-all hover:bg-primary/90 active:scale-95"
          >
            検索
          </button>
        </div>
      </form>

      {/* フィルター */}
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">フィルター:</span>
        {["すべて", "2024", "2023", "2020+", "高引用"].map((filter, i) => (
          <button
            key={filter}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              i === 0
                ? "bg-primary/20 text-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* 検索結果 */}
      {hasSearched && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {mockResults.length}
            </span>{" "}
            件の結果
          </p>
          <div className="space-y-3">
            {mockResults.map((paper) => (
              <div
                key={paper.externalId}
                className="glass-card group rounded-xl p-5 transition-all duration-200 hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors">
                      {paper.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {paper.authors.join(", ")}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground/80 line-clamp-2">
                      {paper.abstract}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      <span className="rounded-md bg-muted px-2 py-1 font-medium">
                        {paper.venue} {paper.year}
                      </span>
                      <span className="text-muted-foreground">
                        引用: {formatCitations(paper.citationCount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <button
                      className={`rounded-lg p-2 transition-all hover:scale-110 ${
                        paper.isInLibrary
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"
                      }`}
                      title={
                        paper.isInLibrary
                          ? "ライブラリに追加済み"
                          : "ライブラリに追加"
                      }
                    >
                      {paper.isInLibrary ? "❤️" : "🤍"}
                    </button>
                    <button
                      className="rounded-lg bg-muted p-2 text-muted-foreground transition-all hover:bg-primary/20 hover:text-primary"
                      title="プロジェクトに追加"
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
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未検索時 */}
      {!hasSearched && (
        <div className="mt-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-3xl">🔬</span>
          </div>
          <p className="text-muted-foreground">
            キーワードを入力して検索を開始してください
          </p>
        </div>
      )}
    </div>
  );
}
