"use client";

import { useEffect, useRef, useState, type KeyboardEventHandler } from "react";

interface UseKeywordTagsEditorParams {
  onAddKeyword: (label: string) => Promise<void>;
  onDeleteKeyword: (keywordId: string) => Promise<void>;
}

export function useKeywordTagsEditor({
  onAddKeyword,
  onDeleteKeyword,
}: UseKeywordTagsEditorParams) {
  const [keywordInputOpen, setKeywordInputOpen] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [keywordSubmitting, setKeywordSubmitting] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (keywordInputOpen) keywordInputRef.current?.focus();
  }, [keywordInputOpen]);

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
  };

  const openInput = () => {
    setDeleteMode(false);
    setKeywordInputOpen(true);
  };

  const closeInput = () => {
    setKeywordInputOpen(false);
    setKeywordDraft("");
  };

  const submitKeyword = async () => {
    const label = keywordDraft.trim();
    if (!label || keywordSubmitting) return;
    setKeywordSubmitting(true);
    try {
      await onAddKeyword(label);
      closeInput();
    } finally {
      setKeywordSubmitting(false);
    }
  };

  const deleteKeyword = async (keywordId: string) => {
    if (!deleteMode || deletingKeywordId) return;
    setDeletingKeywordId(keywordId);
    try {
      await onDeleteKeyword(keywordId);
    } finally {
      setDeletingKeywordId(null);
    }
  };

  const onInputKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submitKeyword();
    }
    if (e.key === "Escape") {
      closeInput();
    }
  };

  const onInputBlur = () => {
    if (!keywordSubmitting && !keywordDraft.trim()) {
      setKeywordInputOpen(false);
    }
  };

  return {
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
  };
}
