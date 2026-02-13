"use client";

/**
 * 論文詳細ページ
 * メタデータ + PDFビューアプレースホルダー + メモ + 関連論文
 */

import { use, useState } from "react";
import Link from "next/link";

type Tab = "overview" | "pdf" | "memos" | "related";

const paper = {
  title: "Attention Is All You Need",
  authors: [
    { name: "Ashish Vaswani", affiliation: "Google Brain" },
    { name: "Noam Shazeer", affiliation: "Google Brain" },
    { name: "Niki Parmar", affiliation: "Google Research" },
    { name: "Jakob Uszkoreit", affiliation: "Google Research" },
  ],
  year: 2017,
  venue: "NeurIPS",
  abstract:
    "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
  doi: "10.48550/arXiv.1706.03762",
  citationCount: 95000,
  status: "READY",
  keywords: ["Transformer", "Self-Attention", "Machine Translation", "NLP"],
  isLiked: true,
  pdfUrl: null,
};

const relatedPapers = [
  {
    id: "r1",
    title: "Sequence to Sequence Learning with Neural Networks",
    authors: "Sutskever et al.",
    year: 2014,
    similarity: 0.92,
  },
  {
    id: "r2",
    title:
      "Neural Machine Translation by Jointly Learning to Align and Translate",
    authors: "Bahdanau et al.",
    year: 2015,
    similarity: 0.89,
  },
  {
    id: "2",
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: "Devlin et al.",
    year: 2019,
    similarity: 0.87,
  },
  {
    id: "r3",
    title:
      "Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context",
    authors: "Dai et al.",
    year: 2019,
    similarity: 0.82,
  },
];

const paperMemos = [
  {
    id: "1",
    title: "Self-Attentionの計算量メモ",
    body: "Self-Attentionの計算量はO(n²d)。シーケンス長nに対して二乗...",
    updatedAt: "2時間前",
  },
  {
    id: "2",
    title: "Multi-Head Attentionの直感",
    body: "ヘッドごとに異なる部分空間で注意を計算する。構文的注意と意味的注意の分離...",
    updatedAt: "昨日",
  },
];

export default function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isLiked, setIsLiked] = useState(paper.isLiked);

  const tabs = [
    { key: "overview" as Tab, label: "概要" },
    { key: "pdf" as Tab, label: "PDF" },
    { key: "memos" as Tab, label: "メモ", count: paperMemos.length },
    { key: "related" as Tab, label: "関連論文", count: relatedPapers.length },
  ];

  return (
    <div className="space-y-6">
      {/* 戻るリンク */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
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
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        ライブラリに戻る
      </Link>

      {/* ヘッダー */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                {paper.status}
              </span>
              <span className="text-xs text-muted-foreground">
                {paper.venue} {paper.year}
              </span>
            </div>
            <h2 className="text-2xl font-bold leading-tight">{paper.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {paper.authors.map((a) => (
                <span key={a.name} className="text-sm text-muted-foreground">
                  {a.name}
                  <span className="text-muted-foreground/50">
                    {" "}
                    · {a.affiliation}
                  </span>
                  {", "}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {paper.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`rounded-xl p-3 transition-all hover:scale-110 ${
                isLiked
                  ? "bg-red-500/10 text-red-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="text-xl">{isLiked ? "❤️" : "🤍"}</span>
            </button>
            <span className="text-[10px] text-muted-foreground">
              引用 {(paper.citationCount / 1000).toFixed(1)}k
            </span>
          </div>
        </div>

        {/* DOI & アクション */}
        <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            DOI: {paper.doi}
          </span>
          <div className="ml-auto flex gap-2">
            <button className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              プロジェクトに追加
            </button>
            <button className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              BibTeX コピー
            </button>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
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
            {tab.count !== undefined && (
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

      {/* タブコンテンツ */}
      {activeTab === "overview" && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-3">Abstract</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {paper.abstract}
          </p>
        </div>
      )}

      {activeTab === "pdf" && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-border">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <span className="text-2xl">📄</span>
              </div>
              <p className="text-sm font-medium">PDFビューア</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {paper.pdfUrl
                  ? "PDFを読み込み中..."
                  : "PDFがアップロードされていません"}
              </p>
              <button className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all">
                PDFをアップロード
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "memos" && (
        <div className="space-y-3">
          {paperMemos.map((memo) => (
            <div
              key={memo.id}
              className="glass-card rounded-xl p-5 transition-all hover:border-primary/30"
            >
              <h4 className="font-medium">{memo.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{memo.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {memo.updatedAt}
              </p>
            </div>
          ))}
          <button className="w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
            + メモを追加
          </button>
        </div>
      )}

      {activeTab === "related" && (
        <div className="space-y-3">
          {relatedPapers.map((rp) => (
            <Link key={rp.id} href={`/papers/${rp.id}`}>
              <div className="glass-card group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:border-primary/30">
                {/* 類似度バー */}
                <div className="flex flex-col items-center gap-1">
                  <div className="h-8 w-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="w-full rounded-full bg-primary transition-all"
                      style={{ height: `${rp.similarity * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {(rp.similarity * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium group-hover:text-primary transition-colors truncate">
                    {rp.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {rp.authors} · {rp.year}
                  </p>
                </div>
                <svg
                  className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
