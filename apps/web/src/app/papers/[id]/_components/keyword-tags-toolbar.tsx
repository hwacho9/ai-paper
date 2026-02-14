import { Check, Trash2 } from "lucide-react";

interface KeywordTagsToolbarProps {
  deleteMode: boolean;
  onToggleDeleteMode: () => void;
}

export function KeywordTagsToolbar({
  deleteMode,
  onToggleDeleteMode,
}: KeywordTagsToolbarProps) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-xs text-muted-foreground">キーワード</span>
      <button
        type="button"
        onClick={onToggleDeleteMode}
        aria-label={deleteMode ? "削除モードを終了" : "削除モードを開始"}
        title={deleteMode ? "削除モードを終了" : "削除モードを開始"}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
          deleteMode
            ? "border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25"
            : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
        }`}
      >
        {deleteMode ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
