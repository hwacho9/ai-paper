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
  type?: "paper" | "prerequisite"; // タイプを指定（デフォルトは paper）
}

export function KeywordInputControl({
  inputOpen,
  draft,
  inputRef,
  onChangeDraft,
  onKeyDown,
  onBlur,
  onOpenInput,
  type = "paper",
}: KeywordInputControlProps) {
  // タイプに応じた色スタイルを決定
  const colorClass =
    type === "prerequisite"
      ? "border-amber-400/50 bg-background text-amber-200 focus:border-amber-300 focus:ring-amber-400/30"
      : "border-sky-400/50 bg-background text-sky-200 focus:border-sky-300 focus:ring-sky-400/30";

  const buttonColorClass =
    type === "prerequisite"
      ? "border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
      : "border-sky-400/50 bg-sky-400/15 text-sky-200 hover:bg-sky-400/25";

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
        className={`h-7 w-36 rounded-md border px-2 text-xs outline-none transition focus:ring-2 ${colorClass}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenInput}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${buttonColorClass}`}
      aria-label="キーワード追加"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}
