import type { PaperKeywordResponse } from "@/lib/api";

interface KeywordTagListProps {
  keywords: PaperKeywordResponse[];
  loading: boolean;
  deleteMode: boolean;
  deletingKeywordId: string | null;
  onDeleteKeyword: (keywordId: string) => void;
}

export function KeywordTagList({
  keywords,
  loading,
  deleteMode,
  deletingKeywordId,
  onDeleteKeyword,
}: KeywordTagListProps) {
  if (loading) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* スケルトン タグ */}
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-md border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs animate-pulse"
          >
            <span className="h-3 w-12 rounded bg-sky-400/20" />
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83"
              strokeLinecap="round"
            />
          </svg>
          キーワード生成中...
        </span>
      </div>
    );
  }

  return (
    <>
      {keywords.map((keyword) => (
        <button
          key={keyword.keyword_id}
          type="button"
          onClick={() => onDeleteKeyword(keyword.keyword_id)}
          disabled={!deleteMode || deletingKeywordId === keyword.keyword_id}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
            deleteMode
              ? "border-red-400/60 bg-red-500/15 text-red-300 hover:bg-red-500/25"
              : "cursor-default border-sky-400/40 bg-sky-400/20 text-sky-200"
          } ${deletingKeywordId === keyword.keyword_id ? "opacity-60" : ""}`}
        >
          {keyword.label}
        </button>
      ))}
    </>
  );
}
