import type { PaperKeywordResponse } from "@/lib/api";

interface MemoEditorFormProps {
  title: string;
  body: string;
  saving: boolean;
  keywords: PaperKeywordResponse[];
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onSave: () => Promise<void>;
}

export function MemoEditorForm({
  title,
  body,
  saving,
  keywords,
  onChangeTitle,
  onChangeBody,
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

      {/* 論文キーワード表示 */}
      {keywords.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <label className="mb-2 block text-xs text-muted-foreground">
            論文キーワード
          </label>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span
                key={kw.keyword_id}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {kw.label}
              </span>
            ))}
          </div>
        </div>
      )}

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
