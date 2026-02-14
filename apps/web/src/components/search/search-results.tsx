"use client";

import type { SearchResultItem } from "@/lib/api";

function formatCitations(count: number | null): string {
    if (!count) return "0";
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
}

interface SearchResultsProps {
    loading: boolean;
    hasSearched: boolean;
    error: string;
    results: SearchResultItem[];
    onLike: (paper: SearchResultItem) => void;
}

export function SearchResults({
    loading,
    hasSearched,
    error,
    results,
    onLike,
}: SearchResultsProps) {
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="glass-card rounded-xl border border-border/50 p-5">
                            <div className="flex flex-col gap-3">
                                <div className="h-6 w-3/4 rounded bg-muted/50" />
                                <div className="h-4 w-1/2 rounded bg-muted/30" />
                                <div className="mt-2 space-y-2">
                                    <div className="h-4 w-full rounded bg-muted/20" />
                                    <div className="h-4 w-5/6 rounded bg-muted/20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!hasSearched || error) {
        return null;
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                    {results.length}
                </span>{" "}
                件の結果
            </p>
            <div className="space-y-3">
                {results.map((paper) => (
                    <div
                        key={paper.external_id}
                        className="glass-card group rounded-xl p-5 transition-all duration-200 hover:border-primary/30">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold leading-snug transition-colors group-hover:text-primary">
                                    {paper.title}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {paper.authors.join(", ")}
                                </p>
                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground/80">
                                    {paper.abstract || "要約なし"}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                                    <span className="rounded-md bg-muted px-2 py-1 font-medium">
                                        {paper.venue || "Unknown Venue"}{" "}
                                        {paper.year || ""}
                                    </span>
                                    <span className="text-muted-foreground">
                                        引用:{" "}
                                        {formatCitations(paper.citation_count)}
                                    </span>
                                    {paper.pdf_url && (
                                        <a
                                            href={paper.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline"
                                            onClick={(e) =>
                                                e.stopPropagation()
                                            }>
                                            <svg
                                                className="h-3 w-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                                />
                                            </svg>
                                            PDF
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={() => onLike(paper)}
                                    className={`rounded-lg p-2 transition-all hover:scale-110 ${
                                        paper.is_in_library
                                            ? "bg-primary/20 text-primary"
                                            : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"
                                    }`}
                                    title={
                                        paper.is_in_library
                                            ? "ライブラリに追加済み"
                                            : "ライブラリに追加"
                                    }>
                                    {paper.is_in_library ? "❤️" : "🤍"}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {results.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">
                        検索結果が見つかりませんでした
                    </div>
                )}
            </div>
        </div>
    );
}
