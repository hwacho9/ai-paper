"use client";

import type { FormEvent } from "react";

interface SearchFormProps {
    query: string;
    onChangeQuery: (value: string) => void;
    loading: boolean;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    showAdvanced: boolean;
    onToggleAdvanced: () => void;
    yearFrom: string;
    onChangeYearFrom: (value: string) => void;
    yearTo: string;
    onChangeYearTo: (value: string) => void;
    author: string;
    onChangeAuthor: (value: string) => void;
}

export function SearchForm({
    query,
    onChangeQuery,
    loading,
    onSubmit,
    showAdvanced,
    onToggleAdvanced,
    yearFrom,
    onChangeYearFrom,
    yearTo,
    onChangeYearTo,
    author,
    onChangeAuthor,
}: SearchFormProps) {
    return (
        <form onSubmit={onSubmit} className="mx-auto max-w-2xl">
            <div className="relative">
                <svg
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onChangeQuery(e.target.value)}
                    placeholder="キーワード、タイトル、著者名..."
                    className="w-full rounded-xl border border-border bg-card py-3.5 pl-12 pr-4 text-base outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50">
                    {loading ? "検索中..." : "検索"}
                </button>
            </div>
            <div className="mt-3">
                <button
                    type="button"
                    onClick={onToggleAdvanced}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
                    詳細設定
                    <span
                        className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}>
                        ▼
                    </span>
                </button>
            </div>
            {showAdvanced && (
                <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-border/60 bg-card/70 p-4 sm:grid-cols-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                            開始年
                        </span>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={yearFrom}
                            onChange={(e) => onChangeYearFrom(e.target.value)}
                            placeholder="例: 2020"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                            終了年
                        </span>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={yearTo}
                            onChange={(e) => onChangeYearTo(e.target.value)}
                            placeholder="例: 2026"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                            著者
                        </span>
                        <input
                            type="text"
                            value={author}
                            onChange={(e) => onChangeAuthor(e.target.value)}
                            placeholder="例: Vaswani"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                    </label>
                </div>
            )}
        </form>
    );
}
