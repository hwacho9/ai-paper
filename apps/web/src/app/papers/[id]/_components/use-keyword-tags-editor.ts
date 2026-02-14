"use client";

import { useEffect, useRef, useState, type KeyboardEventHandler } from "react";

interface UseKeywordTagsEditorParams {
  onAddKeyword: (label: string, reason?: string) => Promise<void>;
  onDeleteKeyword: (keywordId: string) => Promise<void>;
}

export function useKeywordTagsEditor({
  onAddKeyword,
  onDeleteKeyword,
}: UseKeywordTagsEditorParams) {
  // 論文キーワード用の入力状態
  const [paperKeywordInputOpen, setPaperKeywordInputOpen] = useState(false);
  const [paperKeywordDraft, setPaperKeywordDraft] = useState("");
  const paperKeywordInputRef = useRef<HTMLInputElement>(null);

  // 事前知識キーワード用の入力状態
  const [prerequisiteKeywordInputOpen, setPrerequisiteKeywordInputOpen] =
    useState(false);
  const [prerequisiteKeywordDraft, setPrerequisiteKeywordDraft] = useState("");
  const prerequisiteKeywordInputRef = useRef<HTMLInputElement>(null);

  // 共通の状態
  const [keywordSubmitting, setKeywordSubmitting] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (paperKeywordInputOpen) paperKeywordInputRef.current?.focus();
  }, [paperKeywordInputOpen]);

  useEffect(() => {
    if (prerequisiteKeywordInputOpen)
      prerequisiteKeywordInputRef.current?.focus();
  }, [prerequisiteKeywordInputOpen]);

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
  };

  const openPaperKeywordInput = () => {
    setDeleteMode(false);
    setPaperKeywordInputOpen(true);
  };

  const closePaperKeywordInput = () => {
    setPaperKeywordInputOpen(false);
    setPaperKeywordDraft("");
  };

  const openPrerequisiteKeywordInput = () => {
    setDeleteMode(false);
    setPrerequisiteKeywordInputOpen(true);
  };

  const closePrerequisiteKeywordInput = () => {
    setPrerequisiteKeywordInputOpen(false);
    setPrerequisiteKeywordDraft("");
  };

  const submitKeyword = async (draft: string, reason?: string) => {
    const label = draft.trim();
    if (!label || keywordSubmitting) return false;
    setKeywordSubmitting(true);
    try {
      await onAddKeyword(label, reason);
      return true;
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

  // 論文キーワード用ハンドラー
  const paperKeywordOnInputKeyDown: KeyboardEventHandler<HTMLInputElement> = (
    e,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submitKeyword(paperKeywordDraft, "llm_paper_keyword").then(
        (success) => {
          if (success) {
            setPaperKeywordDraft("");
          }
        },
      );
    }
    if (e.key === "Escape") {
      closePaperKeywordInput();
    }
  };

  const paperKeywordOnInputBlur = () => {
    if (!keywordSubmitting && !paperKeywordDraft.trim()) {
      closePaperKeywordInput();
    }
  };

  // 事前知識キーワード用ハンドラー
  const prerequisiteKeywordOnInputKeyDown: KeyboardEventHandler<
    HTMLInputElement
  > = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submitKeyword(
        prerequisiteKeywordDraft,
        "llm_prerequisite_keyword",
      ).then((success) => {
        if (success) {
          setPrerequisiteKeywordDraft("");
        }
      });
    }
    if (e.key === "Escape") {
      closePrerequisiteKeywordInput();
    }
  };

  const prerequisiteKeywordOnInputBlur = () => {
    if (!keywordSubmitting && !prerequisiteKeywordDraft.trim()) {
      closePrerequisiteKeywordInput();
    }
  };

  return {
    // 論文キーワード用
    paperKeywordInputOpen,
    paperKeywordDraft,
    paperKeywordInputRef,
    setPaperKeywordDraft,
    openPaperKeywordInput,
    closePaperKeywordInput,
    paperKeywordOnInputKeyDown,
    paperKeywordOnInputBlur,

    // 事前知識キーワード用
    prerequisiteKeywordInputOpen,
    prerequisiteKeywordDraft,
    prerequisiteKeywordInputRef,
    setPrerequisiteKeywordDraft,
    openPrerequisiteKeywordInput,
    closePrerequisiteKeywordInput,
    prerequisiteKeywordOnInputKeyDown,
    prerequisiteKeywordOnInputBlur,

    // 共通
    deleteMode,
    deletingKeywordId,
    toggleDeleteMode,
    deleteKeyword,
  };
}
