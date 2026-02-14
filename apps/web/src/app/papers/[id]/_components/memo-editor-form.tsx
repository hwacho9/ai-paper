import type { PaperKeywordResponse } from "@/lib/api";

interface MemoEditorFormProps {
  title: string;
  body: string;
  saving: boolean;
  keywords: PaperKeywordResponse[];
  keywordsLoading?: boolean;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onSave: () => Promise<void>;
}

export function MemoEditorForm({
  title,
  body,
  saving,
  keywords,
  keywordsLoading,
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
      <div className="mt-4 border-t border-border pt-3">
        <label className="mb-2 block text-xs text-muted-foreground">
          論文キーワード
        </label>
        {keywordsLoading ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 animate-pulse"
              >
                <span className="h-3 w-10 rounded bg-primary/20" />
              </span>
            ))}
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <svg
                className="h-3 w-3 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83"
                  strokeLinecap="round"
                />
              </svg>
              生成中...
            </span>
          </div>
        ) : keywords.length > 0 ? (
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
        ) : (
          <p className="text-xs text-muted-foreground/60">
            キーワードはまだありません
          </p>
        )}
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
