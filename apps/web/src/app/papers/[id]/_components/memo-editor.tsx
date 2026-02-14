import type { MemoResponse } from "@/lib/api";
import { MemoEditorForm } from "./memo-editor-form";
import { MemoEditorHeader } from "./memo-editor-header";

interface MemoEditorProps {
  memo: MemoResponse | null;
  loading: boolean;
  editing: boolean;
  title: string;
  body: string;
  tags: string;
  saving: boolean;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onChangeTags: (value: string) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onCreate: () => void;
}

export function MemoEditor({
  memo,
  loading,
  editing,
  title,
  body,
  tags,
  saving,
  onChangeTitle,
  onChangeBody,
  onChangeTags,
  onSave,
  onDelete,
  onCreate,
}: MemoEditorProps) {
  return (
    <div className="glass-card flex min-h-[500px] flex-col rounded-xl p-6">
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-muted/50" />
          <div className="h-64 w-full rounded bg-muted/30" />
        </div>
      ) : !memo && !editing ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-muted/30 p-4">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              この論文にはまだメモがありません
            </p>
          </div>
          <button
            onClick={onCreate}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary/20 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/30"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            メモを新規追加
          </button>
        </div>
      ) : (
        <>
          <MemoEditorHeader memo={memo} onDelete={onDelete} />
          <MemoEditorForm
            title={title}
            body={body}
            tags={tags}
            saving={saving}
            onChangeTitle={onChangeTitle}
            onChangeBody={onChangeBody}
            onChangeTags={onChangeTags}
            onSave={onSave}
          />
        </>
      )}
    </div>
  );
}
