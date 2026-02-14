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

  const submitKeyword = async (draft: string) => {
    const label = draft.trim();
    if (!label || keywordSubmitting) return;
    setKeywordSubmitting(true);
    try {
      await onAddKeyword(label);
      // 自動的に閉じない（ユーザーがフォーカスを外したら閉じる）
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

  const createKeyDownHandler =
    (
      draft: string,
      setDraft: (value: string) => void,
      closeInput: () => void,
    ): KeyboardEventHandler<HTMLInputElement> =>
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void submitKeyword(draft).then((success) => {
          if (success) {
            setDraft("");
          }
        });
      }
      if (e.key === "Escape") {
        closeInput();
      }
    };

  const createBlurHandler =
    (draft: string, closeInput: () => void): (() => void) =>
    () => {
      if (!keywordSubmitting && !draft.trim()) {
        closeInput();
      }
    };

  return {
    // 論文キーワード用
    paperKeywordInputOpen,
    paperKeywordDraft,
    paperKeywordInputRef,
    setPaperKeywordDraft,
    openPaperKeywordInput,
    paperKeywordOnInputKeyDown: createKeyDownHandler(
      paperKeywordDraft,
      setPaperKeywordDraft,
      closePaperKeywordInput,
    ),
    paperKeywordOnInputBlur: createBlurHandler(
      paperKeywordDraft,
      closePaperKeywordInput,
    ),

    // 事前知識キーワード用
    prerequisiteKeywordInputOpen,
    prerequisiteKeywordDraft,
    prerequisiteKeywordInputRef,
    setPrerequisiteKeywordDraft,
    openPrerequisiteKeywordInput,
    prerequisiteKeywordOnInputKeyDown: createKeyDownHandler(
      prerequisiteKeywordDraft,
      setPrerequisiteKeywordDraft,
      closePrerequisiteKeywordInput,
    ),
    prerequisiteKeywordOnInputBlur: createBlurHandler(
      prerequisiteKeywordDraft,
      closePrerequisiteKeywordInput,
    ),

    // 共通
    deleteMode,
    deletingKeywordId,
    toggleDeleteMode,
    deleteKeyword,
  };
}
