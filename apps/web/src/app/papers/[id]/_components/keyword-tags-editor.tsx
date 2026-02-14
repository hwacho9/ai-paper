"use client";

import type { PaperKeywordResponse } from "@/lib/api";
import { KeywordInputControl } from "./keyword-input-control";
import { KeywordTagList } from "./keyword-tag-list";
import { KeywordTagsToolbar } from "./keyword-tags-toolbar";
import { useKeywordTagsEditor } from "./use-keyword-tags-editor";

interface KeywordTagsEditorProps {
  keywords: PaperKeywordResponse[];
  loading: boolean;
  error: string | null;
  onAddKeyword: (label: string) => Promise<void>;
  onDeleteKeyword: (keywordId: string) => Promise<void>;
}

export function KeywordTagsEditor({
  keywords,
  loading,
  error,
  onAddKeyword,
  onDeleteKeyword,
}: KeywordTagsEditorProps) {
  const {
    deleteMode,
    deletingKeywordId,
    keywordInputOpen,
    keywordDraft,
    keywordInputRef,
    setKeywordDraft,
    toggleDeleteMode,
    openInput,
    deleteKeyword,
    onInputKeyDown,
    onInputBlur,
  } = useKeywordTagsEditor({ onAddKeyword, onDeleteKeyword });

  return (
    <div className="mt-3">
      <KeywordTagsToolbar
        deleteMode={deleteMode}
        onToggleDeleteMode={toggleDeleteMode}
      />

      <div className="flex flex-wrap items-center gap-2">
        <KeywordTagList
          keywords={keywords}
          loading={loading}
          deleteMode={deleteMode}
          deletingKeywordId={deletingKeywordId}
          onDeleteKeyword={(keywordId) => void deleteKeyword(keywordId)}
        />
        <KeywordInputControl
          inputOpen={keywordInputOpen}
          draft={keywordDraft}
          inputRef={keywordInputRef}
          onChangeDraft={setKeywordDraft}
          onKeyDown={onInputKeyDown}
          onBlur={onInputBlur}
          onOpenInput={openInput}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
