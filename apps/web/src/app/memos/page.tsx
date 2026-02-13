"use client";

/**
 * メモ一覧ページ
 * 全メモの横断検索 + フィルター + 新規作成
 */

import { useState } from "react";

const memos = [
  {
    id: "1",
    title: "Self-Attentionの計算量メモ",
    body: "Self-Attentionの計算量はO(n²d)。シーケンス長nに対して二乗のためLong-Contextでは問題になる。Flash Attentionなどのカーネル最適化が有効。Linearized Attentionも検討の余地あり。",
    paperTitle: "Attention Is All You Need",
    paperId: "1",
    updatedAt: "2時間前",
    color: "border-l-blue-500",
  },
  {
    id: "2",
    title: "BERTとGPTの違いまとめ",
    body: "BERTは双方向エンコーダ（MLM + NSP）、GPTは自己回帰デコーダ。タスクに応じた使い分けが重要。分類タスクはBERT系、生成タスクはGPT系が優位。",
    paperTitle: "BERT: Pre-training of Deep Bidirectional Transformers",
    paperId: "2",
    updatedAt: "昨日",
    color: "border-l-emerald-500",
  },
  {
    id: "3",
    title: "In-Context Learningのメカニズム",
    body: "GPT-3はプロンプト内の例示（few-shot）からパターンを学習する。モデルサイズに依存し、小型モデルでは発現しにくい。Meta-learningとの関連が指摘されている。",
    paperTitle: "Language Models are Few-Shot Learners",
    paperId: "3",
    updatedAt: "3日前",
    color: "border-l-purple-500",
  },
  {
    id: "4",
    title: "ViTのパッチ分割戦略",
    body: "画像を16×16のパッチに分割し、各パッチを線形射影でembeddingに変換。位置エンコーディングは学習可能。CNNと異なりinductive biasが少ないため大規模データが必要。",
    paperTitle: "An Image is Worth 16x16 Words: ViT",
    paperId: "4",
    updatedAt: "1週間前",
    color: "border-l-amber-500",
  },
  {
    id: "5",
    title: "スケーリング則の要点",
    body: "損失はパラメータ数N、データ量D、計算量Cのべき乗則に従う。最適なN/D比はChinchillaで修正された。計算予算が決まればN/Dの最適バランスを理論的に算出可能。",
    paperTitle: "Scaling Laws for Neural Language Models",
    paperId: "5",
    updatedAt: "2週間前",
    color: "border-l-rose-500",
  },
];

export default function MemosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  const filtered = memos.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.body.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">メモ</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {memos.length} 件のメモ
          </p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
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
          新規メモ
        </button>
      </div>

      {/* 検索バー */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
          placeholder="メモを検索..."
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none
            focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* メモ一覧 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((memo) => (
          <div
            key={memo.id}
            className={`glass-card group rounded-xl border-l-4 ${memo.color} p-5 transition-all duration-200 hover:scale-[1.01] hover:border-primary/30`}
          >
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {memo.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
              {memo.body}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <a
                href={`/papers/${memo.paperId}`}
                className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l-1.757 1.757a4.5 4.5 0 01-6.364 6.364l4.5-4.5a4.5 4.5 0 017.244 1.242z"
                  />
                </svg>
                {memo.paperTitle}
              </a>
              <span className="text-xs text-muted-foreground">
                {memo.updatedAt}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-3xl">📝</span>
          </div>
          <p className="text-muted-foreground">
            {searchQuery
              ? "該当するメモが見つかりません"
              : "メモがまだありません"}
          </p>
        </div>
      )}

      {/* エディタダイアログ */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg rounded-2xl p-6 mx-4">
            <h3 className="text-lg font-semibold">新規メモ</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  タイトル
                </label>
                <input
                  type="text"
                  placeholder="メモのタイトル"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  本文
                </label>
                <textarea
                  placeholder="メモの内容を入力..."
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  紐付け論文
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="">選択してください</option>
                  <option>Attention Is All You Need</option>
                  <option>BERT</option>
                  <option>GPT-3</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
