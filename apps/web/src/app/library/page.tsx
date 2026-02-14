"use client";

/**
 * マイライブラリ — いいね済み論文一覧
 * グリッド/リスト切替 + ソート + フィルター + ライブラリ削除
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getLibrary, toggleLike, PaperResponse } from "@/lib/api";
import { toast } from "sonner";
import { PdfUploadButton } from "@/components/pdf-upload-button";

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
  PENDING: "保存済",
  FAILED: "失敗",
};

export default function LibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [papers, setPapers] = useState<PaperResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const libraryData = await getLibrary();
      setPapers(libraryData.papers);
    } catch (err) {
      console.error(err);
      toast.error("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemove = async (paper: PaperResponse) => {
    if (!confirm(`「${paper.title}」をライブラリから削除しますか？`)) return;

    setRemovingId(paper.id);
    try {
      await toggleLike(paper.id, {
        external_id: paper.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        venue: paper.venue ?? "",
        abstract: paper.abstract ?? "",
        doi: paper.doi,
        arxiv_id: paper.arxiv_id,
        pdf_url: paper.pdf_url,
      });
      setPapers((prev) => prev.filter((p) => p.id !== paper.id));
      toast.success("ライブラリから削除しました");
    } catch (err) {
      console.error(err);
      toast.error("削除に失敗しました");
    } finally {
      setRemovingId(null);
    }
  };

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
              className={`rounded-l-lg p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
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
              className={`rounded-r-lg p-2 transition-colors ${
                viewMode === "list"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
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

      {papers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>ライブラリは空です。検索から論文を追加してください。</p>
          <Link
            href="/search"
            className="text-primary hover:underline mt-2 inline-block"
          >
            論文を検索する
          </Link>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {papers.map((paper) => (
            <div key={paper.id} className="relative group">
              <Link href={`/papers/${paper.id}`}>
                <div className="glass-card h-full rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] hover:border-primary/30 hover:glow flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        statusColors[paper.status] ||
                        "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {statusLabels[paper.status] || paper.status}
                    </span>
                  </div>
                  <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {paper.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground truncate">
                    {paper.authors.join(", ")}
                  </p>
                  <p className="mt-auto pt-2 text-xs text-muted-foreground">
                    {paper.venue} {paper.year}
                  </p>
                </div>
              </Link>
              {/* Actions */}
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <PdfUploadButton
                  paperId={paper.id}
                  variant="secondary"
                  size="icon"
                />
                <button
                  onClick={() => handleRemove(paper)}
                  disabled={removingId === paper.id}
                  title="ライブラリから削除"
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {removingId === paper.id ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
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
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* リストビュー */
        <div className="space-y-2">
          {papers.map((paper) => (
            <div key={paper.id} className="relative group">
              <Link href={`/papers/${paper.id}`}>
                <div className="glass-card flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:border-primary/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium group-hover:text-primary transition-colors truncate">
                        {paper.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          statusColors[paper.status] ||
                          "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {statusLabels[paper.status] || paper.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {paper.authors.join(", ")} · {paper.venue} {paper.year}
                    </p>
                  </div>
                </div>
              </Link>
              <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <PdfUploadButton
                  paperId={paper.id}
                  variant="ghost"
                  size="icon"
                />
                <button
                  onClick={() => handleRemove(paper)}
                  disabled={removingId === paper.id}
                  title="ライブラリから削除"
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {removingId === paper.id ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
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
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
