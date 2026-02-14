import type { MemoResponse } from "@/lib/api";

interface MemoEditorProps {
  memo: MemoResponse | null;
  loading: boolean;
  title: string;
  body: string;
  tags: string;
  saving: boolean;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onChangeTags: (value: string) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export function MemoEditor({
  memo,
  loading,
  title,
  body,
  tags,
  saving,
  onChangeTitle,
  onChangeBody,
  onChangeTags,
  onSave,
  onDelete,
}: MemoEditorProps) {
  return (
    <div className="glass-card flex min-h-[500px] flex-col rounded-xl p-6">
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-muted/50" />
          <div className="h-64 w-full rounded bg-muted/30" />
        </div>
      ) : (
        <>
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

          <input
            type="text"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="タイトル"
            className="mb-4 w-full bg-transparent text-xl font-bold outline-none placeholder:text-muted-foreground/40"
          />

          <div className="mb-4 border-t border-border" />

          <textarea
            value={body}
            onChange={(e) => onChangeBody(e.target.value)}
            placeholder="Markdownでメモを記述..."
            className="min-h-[300px] w-full flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/40"
          />

          <div className="mt-4">
            <label className="mb-1 block text-xs text-muted-foreground">
              タグ（カンマ区切り）
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => onChangeTags(e.target.value)}
              placeholder="transformer, survey"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onSave}
              disabled={saving || (!title.trim() && !body.trim())}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
