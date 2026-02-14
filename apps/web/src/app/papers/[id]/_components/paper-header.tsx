import type { PaperKeywordResponse } from "@/lib/api";
import type { Paper } from "../types";
import { KeywordTagsEditor } from "./keyword-tags-editor";

interface PaperHeaderProps {
  paper: Paper;
  keywords: PaperKeywordResponse[];
  keywordsLoading: boolean;
  keywordsError: string | null;
  onAddKeyword: (label: string) => Promise<void>;
  onDeleteKeyword: (keywordId: string) => Promise<void>;
}

export function PaperHeader({
  paper,
  keywords,
  keywordsLoading,
  keywordsError,
  onAddKeyword,
  onDeleteKeyword,
}: PaperHeaderProps) {
  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                paper.status === "READY"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : paper.status === "INGESTING"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {paper.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {paper.venue} {paper.year}
            </span>
          </div>
          <h2 className="text-2xl font-bold leading-tight">{paper.title}</h2>
          <div className="mt-3 flex flex-wrap gap-1">
            {paper.authors.map((author) => (
              <span key={author} className="text-sm text-muted-foreground">
                {author},{" "}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
        {paper.doi && (
          <span className="text-xs text-muted-foreground">DOI: {paper.doi}</span>
        )}
        {paper.arxiv_id && (
          <span className="text-xs text-muted-foreground">
            arXiv: {paper.arxiv_id}
          </span>
        )}
      </div>
      <KeywordTagsEditor
        keywords={keywords}
        loading={keywordsLoading}
        error={keywordsError}
        onAddKeyword={onAddKeyword}
        onDeleteKeyword={onDeleteKeyword}
      />
    </div>
  );
}
