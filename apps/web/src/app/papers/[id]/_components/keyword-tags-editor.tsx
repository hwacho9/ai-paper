"use client";

import type { PaperKeywordResponse } from "@/lib/api";
import { KeywordInputControl } from "./keyword-input-control";
import { KeywordTagsToolbar } from "./keyword-tags-toolbar";
import { useKeywordTagsEditor } from "./use-keyword-tags-editor";
import type { KeywordRelatedStatusMap } from "./use-keyword-related-status";

interface KeywordTagsEditorProps {
  keywords: PaperKeywordResponse[];
  loading: boolean;
  error: string | null;
  onAddKeyword: (label: string, reason?: string) => Promise<void>;
  onDeleteKeyword: (keywordId: string) => Promise<void>;
  onKeywordClick?: (label: string) => void;
  keywordRelatedStatusMap?: KeywordRelatedStatusMap;
  keywordRelatedStatusLoading?: boolean;
}

export function KeywordTagsEditor({
  keywords,
  loading,
  error,
  onAddKeyword,
  onDeleteKeyword,
  onKeywordClick,
  keywordRelatedStatusMap,
  keywordRelatedStatusLoading,
}: KeywordTagsEditorProps) {
  const {
    deleteMode,
    deletingKeywordId,
    paperKeywordInputOpen,
    paperKeywordDraft,
    paperKeywordInputRef,
    setPaperKeywordDraft,
    openPaperKeywordInput,
    paperKeywordOnInputKeyDown,
    paperKeywordOnInputBlur,
    prerequisiteKeywordInputOpen,
    prerequisiteKeywordDraft,
    prerequisiteKeywordInputRef,
    setPrerequisiteKeywordDraft,
    openPrerequisiteKeywordInput,
    prerequisiteKeywordOnInputKeyDown,
    prerequisiteKeywordOnInputBlur,
    toggleDeleteMode,
    deleteKeyword,
  } = useKeywordTagsEditor({ onAddKeyword, onDeleteKeyword });

  // キーワードを論文キーワードと事前知識キーワードに分類
  const paperKeywords = keywords.filter(
    (kw) => kw.reason !== "llm_prerequisite_keyword",
  );
  const prerequisiteKeywords = keywords.filter(
    (kw) => kw.reason === "llm_prerequisite_keyword",
  );

  const renderTag = (
    keyword: PaperKeywordResponse,
    isPrerequisite: boolean,
  ) => {
    const normalizedLabel = keyword.label.trim().toLowerCase();
    const hasRelated = keywordRelatedStatusMap?.[normalizedLabel];
    const linkedStyle = isPrerequisite
      ? "cursor-pointer border-amber-400/40 bg-amber-400/20 text-amber-200 hover:bg-amber-400/30"
      : "cursor-pointer border-sky-400/40 bg-sky-400/20 text-sky-200 hover:bg-sky-400/30";
    const unlinkedStyle = isPrerequisite
      ? "cursor-pointer border-amber-300/20 bg-zinc-500/15 text-amber-100/80"
      : "cursor-pointer border-sky-300/20 bg-zinc-500/15 text-sky-100/80";

    const baseStyle = deleteMode
      ? "border-red-400/60 bg-red-500/15 text-red-300"
      : hasRelated === true
        ? linkedStyle
      : hasRelated === false
        ? unlinkedStyle
      : keywordRelatedStatusLoading
        ? "cursor-pointer border-primary/30 bg-primary/10 text-primary/80"
      : linkedStyle;

    const handleClick = () => {
      if (deleteMode) {
        void deleteKeyword(keyword.keyword_id);
        return;
      }
      onKeywordClick?.(keyword.label);
    };

    return (
      <button
        key={keyword.keyword_id}
        type="button"
        onClick={handleClick}
        disabled={deletingKeywordId === keyword.keyword_id}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${baseStyle} ${
          deletingKeywordId === keyword.keyword_id ? "opacity-60" : ""
        }`}
      >
        {keyword.label}
      </button>
    );
  };

  return (
    <div className="mt-3">
      <KeywordTagsToolbar
        deleteMode={deleteMode}
        onToggleDeleteMode={toggleDeleteMode}
      />

      {loading ? (
        <div className="space-y-3">
          {/* スケルトン: 論文キーワード */}
          <div>
            <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              📄 論文キーワード
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {[...Array(3)].map((_, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-md border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs animate-pulse"
                >
                  <span className="h-3 w-12 rounded bg-sky-400/20" />
                </span>
              ))}
            </div>
          </div>
          {/* スケルトン: 事前知識キーワード */}
          <div>
            <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              📚 事前知識キーワード
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {[...Array(2)].map((_, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs animate-pulse"
                >
                  <span className="h-3 w-12 rounded bg-amber-400/20" />
                </span>
              ))}
            </div>
          </div>
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
      ) : (
        <div className="space-y-3">
          {/* 論文キーワード */}
          <div>
            <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              📄 論文キーワード
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {paperKeywords.length > 0 ? (
                paperKeywords.map((kw) => renderTag(kw, false))
              ) : (
                <span className="text-xs text-muted-foreground/50">なし</span>
              )}
              {/* 論文キーワード追加ボタン */}
              <KeywordInputControl
                inputOpen={paperKeywordInputOpen}
                draft={paperKeywordDraft}
                inputRef={paperKeywordInputRef}
                onChangeDraft={setPaperKeywordDraft}
                onKeyDown={paperKeywordOnInputKeyDown}
                onBlur={paperKeywordOnInputBlur}
                onOpenInput={openPaperKeywordInput}
                type="paper"
              />
            </div>
          </div>

          {/* 事前知識キーワード */}
          <div>
            <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              📚 事前知識キーワード
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {prerequisiteKeywords.length > 0 ? (
                prerequisiteKeywords.map((kw) => renderTag(kw, true))
              ) : (
                <span className="text-xs text-muted-foreground/50">なし</span>
              )}
              {/* 事前知識キーワード追加ボタン */}
              <KeywordInputControl
                inputOpen={prerequisiteKeywordInputOpen}
                draft={prerequisiteKeywordDraft}
                inputRef={prerequisiteKeywordInputRef}
                onChangeDraft={setPrerequisiteKeywordDraft}
                onKeyDown={prerequisiteKeywordOnInputKeyDown}
                onBlur={prerequisiteKeywordOnInputBlur}
                onOpenInput={openPrerequisiteKeywordInput}
                type="prerequisite"
              />
            </div>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
