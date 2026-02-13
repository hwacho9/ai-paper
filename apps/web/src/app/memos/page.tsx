"use client";

/**
 * メモ一覧ページ
 * 全メモの横断検索 + フィルター + 新規作成
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMemos, MemoResponse } from "@/lib/api";
import { toast } from "sonner";

export default function MemosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [memos, setMemos] = useState<MemoResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemos = async () => {
      try {
        const data = await getMemos();
        setMemos(data.memos);
      } catch (err) {
        console.error(err);
        toast.error("メモの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchMemos();
  }, []);

  const filtered = memos.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.body.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        読み込み中...
      </div>
    );
  }

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
      {filtered.length === 0 ? (
        <div className="mt-8 text-center text-muted-foreground">
          {searchQuery
            ? "該当するメモが見つかりません"
            : "メモがまだありません"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((memo) => (
            <div
              key={memo.id}
              className={`glass-card group rounded-xl border-l-4 border-l-primary p-5 transition-all duration-200 hover:scale-[1.01] hover:border-primary/30`}
            >
              <h3 className="font-semibold group-hover:text-primary transition-colors">
                {memo.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {memo.body}
              </p>
              <div className="mt-3 flex items-center justify-between">
                {memo.refs.length > 0 && memo.refs[0].ref_type === "paper" ? (
                  <Link
                    href={`/papers/${memo.refs[0].ref_id}`}
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
                    関連論文へ
                  </Link>
                ) : (
                  <span></span>
                )}
                <span className="text-xs text-muted-foreground">
                  {memo.updated_at
                    ? new Date(memo.updated_at).toLocaleDateString()
                    : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* エディタダイアログ（モック） */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg rounded-2xl p-6 mx-4">
            <h3 className="text-lg font-semibold">新規メモ</h3>
            <p className="text-sm text-muted-foreground mt-2">
              手動作成機能は開発中です。検索結果から論文を「いいね」すると自動的にメモが作成されます。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
