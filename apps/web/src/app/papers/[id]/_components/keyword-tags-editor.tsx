"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { PaperKeywordResponse } from "@/lib/api";

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
  const [keywordInputOpen, setKeywordInputOpen] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [keywordSubmitting, setKeywordSubmitting] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (keywordInputOpen) keywordInputRef.current?.focus();
  }, [keywordInputOpen]);

  const handleAddKeyword = async () => {
    const label = keywordDraft.trim();
    if (!label || keywordSubmitting) return;
    setKeywordSubmitting(true);
    try {
      await onAddKeyword(label);
      setKeywordDraft("");
      setKeywordInputOpen(false);
    } finally {
      setKeywordSubmitting(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    if (!deleteMode || deletingKeywordId) return;
    setDeletingKeywordId(keywordId);
    try {
      await onDeleteKeyword(keywordId);
    } finally {
      setDeletingKeywordId(null);
    }
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">キーワード</span>
        <button
          type="button"
          onClick={() => setDeleteMode((prev) => !prev)}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
            deleteMode
              ? "border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25"
              : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
          }`}
        >
          {deleteMode ? (
            <>
              <Check className="h-3.5 w-3.5" />
              完了
            </>
          ) : (
            <>
              <Trash2 className="h-3.5 w-3.5" />
              削除モード
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {loading && (
          <span className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
            読み込み中...
          </span>
        )}

        {!loading &&
          keywords.map((keyword) => (
            <button
              key={keyword.keyword_id}
              type="button"
              onClick={() => handleDeleteKeyword(keyword.keyword_id)}
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

        {keywordInputOpen ? (
          <input
            ref={keywordInputRef}
            type="text"
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddKeyword();
              }
              if (e.key === "Escape") {
                setKeywordInputOpen(false);
                setKeywordDraft("");
              }
            }}
            onBlur={() => {
              if (!keywordSubmitting && !keywordDraft.trim()) {
                setKeywordInputOpen(false);
              }
            }}
            placeholder="キーワードを入力"
            className="h-7 w-36 rounded-md border border-sky-400/50 bg-background px-2 text-xs outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDeleteMode(false);
              setKeywordInputOpen(true);
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-sky-400/50 bg-sky-400/15 text-sky-200 transition-colors hover:bg-sky-400/25"
            aria-label="キーワード追加"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
