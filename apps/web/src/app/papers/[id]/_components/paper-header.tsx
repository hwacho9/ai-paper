import type { PaperKeywordResponse } from "@/lib/api";
import type { Paper, ProjectSummary } from "../types";
import { KeywordTagsEditor } from "./keyword-tags-editor";
import { ProjectTagsEditor } from "./project-tags-editor";
import type { KeywordRelatedStatusMap } from "./use-keyword-related-status";

interface PaperHeaderProps {
  paper: Paper;
  keywords: PaperKeywordResponse[];
  keywordsLoading: boolean;
  keywordsError: string | null;
  onAddKeyword: (label: string) => Promise<void>;
  onDeleteKeyword: (keywordId: string) => Promise<void>;
  onKeywordClick?: (label: string) => void;
  keywordRelatedStatusMap?: KeywordRelatedStatusMap;
  keywordRelatedStatusLoading?: boolean;
  projects: ProjectSummary[];
  linkedProjectIds: string[];
  projectsLoading: boolean;
  projectsError: string | null;
  onAddProject: (projectId: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

const statusColors: Record<"READY" | "PROCESSING" | "FAILED", string> = {
  READY: "bg-emerald-500/20 text-emerald-400",
  PROCESSING: "bg-amber-500/20 text-amber-400",
  FAILED: "bg-red-500/20 text-red-400",
};

const statusLabels: Record<"READY" | "PROCESSING" | "FAILED", string> = {
  READY: "完了",
  PROCESSING: "処理中",
  FAILED: "失敗",
};

function getDisplayStatus(
  paper: Paper,
  keywords: PaperKeywordResponse[],
): "READY" | "PROCESSING" | "FAILED" {
  const hasPaperKeywordsFromTags = keywords.some(
    (kw) => kw.reason !== "llm_prerequisite_keyword",
  );
  const hasPrerequisiteKeywordsFromTags = keywords.some(
    (kw) => kw.reason === "llm_prerequisite_keyword",
  );
  const hasPaperKeywordsFromPaper = Boolean(paper.keywords?.length);
  const hasPrerequisiteKeywordsFromPaper = Boolean(
    paper.prerequisite_keywords?.length,
  );
  const hasPaperKeywords = hasPaperKeywordsFromTags || hasPaperKeywordsFromPaper;
  const hasPrerequisiteKeywords =
    hasPrerequisiteKeywordsFromTags || hasPrerequisiteKeywordsFromPaper;

  if (hasPaperKeywords && hasPrerequisiteKeywords) {
    return "READY";
  }
  if (paper.status === "FAILED") {
    return "FAILED";
  }
  return "PROCESSING";
}

export function PaperHeader({
  paper,
  keywords,
  keywordsLoading,
  keywordsError,
  onAddKeyword,
  onDeleteKeyword,
  onKeywordClick,
  keywordRelatedStatusMap,
  keywordRelatedStatusLoading,
  projects,
  linkedProjectIds,
  projectsLoading,
  projectsError,
  onAddProject,
  onDeleteProject,
}: PaperHeaderProps) {
  const displayStatus = getDisplayStatus(paper, keywords);

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusColors[displayStatus]}`}
            >
              {statusLabels[displayStatus]}
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
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline hover:no-underline"
          >
            https://doi.org/{paper.doi}
          </a>
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
        onKeywordClick={onKeywordClick}
        keywordRelatedStatusMap={keywordRelatedStatusMap}
        keywordRelatedStatusLoading={keywordRelatedStatusLoading}
      />
      <ProjectTagsEditor
        projects={projects}
        linkedProjectIds={linkedProjectIds}
        loading={projectsLoading}
        error={projectsError}
        onAddProject={onAddProject}
        onDeleteProject={onDeleteProject}
      />
    </div>
  );
}
