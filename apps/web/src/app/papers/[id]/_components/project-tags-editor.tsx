"use client";

import { Check, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProjectSummary } from "../types";

interface ProjectTagsEditorProps {
  projects: ProjectSummary[];
  linkedProjectIds: string[];
  loading: boolean;
  error: string | null;
  onAddProject: (projectId: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export function ProjectTagsEditor({
  projects,
  linkedProjectIds,
  loading,
  error,
  onAddProject,
  onDeleteProject,
}: ProjectTagsEditorProps) {
  const [deleteMode, setDeleteMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const linkedProjects = useMemo(
    () => projects.filter((project) => linkedProjectIds.includes(project.id)),
    [projects, linkedProjectIds],
  );
  const unlinkedProjects = useMemo(
    () => projects.filter((project) => !linkedProjectIds.includes(project.id)),
    [projects, linkedProjectIds],
  );

  const handleToggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
    setPickerOpen(false);
    setSelectedProjectId("");
  };

  const handleOpenPicker = () => {
    setDeleteMode(false);
    setPickerOpen(true);
  };

  const handleAddProject = async () => {
    if (!selectedProjectId || submitting) return;
    setSubmitting(true);
    try {
      await onAddProject(selectedProjectId);
      setSelectedProjectId("");
      setPickerOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!deleteMode || deletingProjectId) return;
    setDeletingProjectId(projectId);
    try {
      await onDeleteProject(projectId);
    } finally {
      setDeletingProjectId(null);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">所属プロジェクト</span>
        <button
          type="button"
          onClick={handleToggleDeleteMode}
          aria-label={deleteMode ? "削除モードを終了" : "削除モードを開始"}
          title={deleteMode ? "削除モードを終了" : "削除モードを開始"}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
            deleteMode
              ? "border-red-500/50 bg-red-500/15 text-red-500 hover:bg-red-500/25"
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

      {loading ? (
        <div className="flex flex-wrap items-center gap-2">
          {[...Array(2)].map((_, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-md border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-xs animate-pulse"
            >
              <span className="h-3 w-16 rounded bg-teal-400/20" />
            </span>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {linkedProjects.length > 0 ? (
              linkedProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => void handleDeleteProject(project.id)}
                  disabled={deletingProjectId === project.id}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                    deleteMode
                      ? "border-red-400/60 bg-red-500/15 text-red-500"
                      : "border-teal-300 bg-teal-100 text-teal-800 hover:bg-teal-200 dark:border-teal-400/40 dark:bg-teal-500/15 dark:text-teal-200 dark:hover:bg-teal-500/25"
                  } ${deletingProjectId === project.id ? "opacity-60" : ""}`}
                >
                  {project.title}
                </button>
              ))
            ) : (
              <span className="text-xs text-muted-foreground/60">未登録</span>
            )}

            {unlinkedProjects.length > 0 && !pickerOpen && (
              <button
                type="button"
                onClick={handleOpenPicker}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-teal-300 bg-teal-100 text-teal-800 transition-colors hover:bg-teal-200 dark:border-teal-400/50 dark:bg-teal-500/15 dark:text-teal-200 dark:hover:bg-teal-500/25"
                aria-label="所属プロジェクト追加"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          {pickerOpen && unlinkedProjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-8 min-w-52 rounded-md border border-teal-300 bg-background px-2 text-xs text-teal-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-teal-400/50 dark:text-teal-200 dark:focus:border-teal-300 dark:focus:ring-teal-400/30"
              >
                <option value="">追加するプロジェクトを選択</option>
                {unlinkedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleAddProject()}
                disabled={!selectedProjectId || submitting}
                className="rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-200 disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200 dark:hover:bg-emerald-500/30"
              >
                追加
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setSelectedProjectId("");
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                閉じる
              </button>
            </div>
          )}

          {!pickerOpen && unlinkedProjects.length === 0 && projects.length > 0 && (
            <p className="text-xs text-muted-foreground/70">
              すべてのプロジェクトに追加済みです
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
