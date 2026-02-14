import type { MemoResponse } from "@/lib/api";

interface MemoEditorHeaderProps {
  memo: MemoResponse | null;
  onDelete: () => Promise<void>;
}

export function MemoEditorHeader({ memo, onDelete }: MemoEditorHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">
          {memo ? "メモを編集" : "新しいメモを作成"}
        </h3>
        {memo && (
          <span className="text-xs text-muted-foreground">
            最終更新: {new Date(memo.updated_at).toLocaleString("ja-JP")}
          </span>
        )}
      </div>
      {memo && (
        <button
          onClick={onDelete}
          className="text-xs text-red-400 transition-colors hover:text-red-500"
        >
          このメモを削除
        </button>
      )}
    </div>
  );
}
