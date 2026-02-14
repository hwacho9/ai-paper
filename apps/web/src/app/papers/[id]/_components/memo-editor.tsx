import type { MemoResponse } from "@/lib/api";
import { MemoEditorForm } from "./memo-editor-form";
import { MemoEditorHeader } from "./memo-editor-header";

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
