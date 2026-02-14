import { Plus } from "lucide-react";
import type { KeyboardEventHandler, RefObject } from "react";

interface KeywordInputControlProps {
  inputOpen: boolean;
  draft: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChangeDraft: (value: string) => void;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onBlur: () => void;
  onOpenInput: () => void;
}

export function KeywordInputControl({
  inputOpen,
  draft,
  inputRef,
  onChangeDraft,
  onKeyDown,
  onBlur,
  onOpenInput,
}: KeywordInputControlProps) {
  if (inputOpen) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => onChangeDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder="キーワードを入力"
        className="h-7 w-36 rounded-md border border-sky-400/50 bg-background px-2 text-xs outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenInput}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-sky-400/50 bg-sky-400/15 text-sky-200 transition-colors hover:bg-sky-400/25"
      aria-label="キーワード追加"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}
