"use client";

/**
 * プロジェクト詳細ページ
 * タブ切替: 参照論文 / メモ / BibTeX Export
 */

import { useState, use } from "react";
import Link from "next/link";

type Tab = "papers" | "memos" | "export";

const project = {
  id: "1",
  title: "Transformer Survey",
  description:
    "Transformer系アーキテクチャの進化と応用に関するサーベイ論文プロジェクト",
};

const projectPapers = [
  {
    id: "1",
    title: "Attention Is All You Need",
    authors: "Vaswani et al.",
    year: 2017,
    venue: "NeurIPS",
  },
  {
    id: "2",
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: "Devlin et al.",
    year: 2019,
    venue: "NAACL",
  },
  {
    id: "3",
    title: "Language Models are Few-Shot Learners",
    authors: "Brown et al.",
    year: 2020,
    venue: "NeurIPS",
  },
  {
    id: "4",
    title: "An Image is Worth 16x16 Words: ViT",
    authors: "Dosovitskiy et al.",
    year: 2021,
    venue: "ICLR",
  },
];

const projectMemos = [
  {
    id: "1",
    title: "Self-Attentionの計算量メモ",
    body: "Self-Attentionの計算量はO(n²d)。シーケンス長nに対して二乗...",
    updatedAt: "2時間前",
  },
  {
    id: "2",
    title: "BERTとGPTの違いまとめ",
    body: "BERTは双方向、GPTは左から右。タスクに応じた使い分けが重要...",
    updatedAt: "昨日",
  },
];

const bibtexSample = `@inproceedings{vaswani2017attention,
  title={Attention is all you need},
  author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  booktitle={NeurIPS},
  year={2017}
}

@inproceedings{devlin2019bert,
  title={BERT: Pre-training of Deep Bidirectional Transformers},
  author={Devlin, Jacob and Chang, Ming-Wei},
  booktitle={NAACL},
  year={2019}
}`;

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("papers");

  const tabs = [
    { key: "papers" as Tab, label: "参照論文", count: projectPapers.length },
    { key: "memos" as Tab, label: "メモ", count: projectMemos.length },
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
          <span>{projectPapers.length} 論文</span>
          <span>{projectMemos.length} メモ</span>
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

      {/* タブコンテンツ */}
      {activeTab === "papers" && (
        <div className="space-y-3">
          {projectPapers.map((paper) => (
            <Link key={paper.id} href={`/papers/${paper.id}`}>
              <div className="glass-card group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:border-primary/30">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                  {paper.year.toString().slice(-2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium group-hover:text-primary transition-colors truncate">
                    {paper.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {paper.authors} · {paper.venue} {paper.year}
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
          <button className="w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
            + 論文を追加
          </button>
        </div>
      )}

      {activeTab === "memos" && (
        <div className="space-y-3">
          {projectMemos.map((memo) => (
            <div
              key={memo.id}
              className="glass-card rounded-xl p-5 transition-all duration-200 hover:border-primary/30"
            >
              <h4 className="font-medium">{memo.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {memo.body}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {memo.updatedAt}
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "export" && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">BibTeX</h4>
            <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
              コピー
            </button>
          </div>
          <pre className="rounded-lg bg-background p-4 text-xs text-muted-foreground overflow-x-auto font-mono">
            {bibtexSample}
          </pre>
        </div>
      )}
    </div>
  );
}
