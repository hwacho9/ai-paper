interface MemoEditorFormProps {
  title: string;
  body: string;
  tags: string;
  saving: boolean;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onChangeTags: (value: string) => void;
  onSave: () => Promise<void>;
}

export function MemoEditorForm({
  title,
  body,
  tags,
  saving,
  onChangeTitle,
  onChangeBody,
  onChangeTags,
  onSave,
}: MemoEditorFormProps) {
  return (
    <>
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
  );
}
