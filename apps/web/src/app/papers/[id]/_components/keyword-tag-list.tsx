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
      <span className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
        読み込み中...
      </span>
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
