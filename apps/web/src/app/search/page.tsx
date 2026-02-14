"use client";

/**
 * 論文検索ページ
 * 検索フォーム + フィルター + 結果グリッド
 */

import { useState } from "react";
import {
    searchPapers,
    SearchResultItem,
    toggleLike,
    PaperCreate,
} from "@/lib/api";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

function formatCitations(count: number | null): string {
    if (!count) return "0";
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
}

export default function SearchPage() {
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError("");
        setHasSearched(true);

        try {
            const data = await searchPapers({ q: query, limit: 20 });
            setResults(data.results);
        } catch (err: any) {
            // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error(err);
            setError(err.message || "検索中にエラーが発生しました");
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (paper: SearchResultItem) => {
        if (!user) {
            toast.error("ライブラリ機能を使用するにはログインが必要です");
            return;
        }

        // 楽観的UI更新
        const originalResults = [...results];
        setResults(
            results.map((p) =>
                p.external_id === paper.external_id
                    ? { ...p, is_in_library: !p.is_in_library }
                    : p,
            ),
        );

        try {
            const paperData: PaperCreate = {
                external_id: paper.external_id,
                source: paper.source,
                title: paper.title,
                authors: paper.authors,
                year: paper.year,
                venue: paper.venue,
                abstract: paper.abstract,
                doi: paper.doi,
                arxiv_id: paper.arxiv_id,
                pdf_url: paper.pdf_url,
            };

            const isLiked = await toggleLike(paper.external_id, paperData);

            // サーバーの結果で確定
            setResults((current) =>
                current.map((p) =>
                    p.external_id === paper.external_id
                        ? { ...p, is_in_library: isLiked }
                        : p,
                ),
            );

            toast.success(
                isLiked
                    ? "ライブラリに追加しました"
                    : "ライブラリから削除しました",
            );
        } catch (err) {
            console.error(err);
            toast.error("操作に失敗しました");
            setResults(originalResults); // ロールバック
        }
    };

    return (
        <div className="space-y-6">
            {/* 検索ヘッダー */}
            <div className="text-center">
                <h2 className="text-2xl font-bold">
                    <span className="gradient-text">論文を検索</span>
                </h2>
                <p className="mt-2 text-muted-foreground">
                    Geminiベースで関連論文を検索できます
                </p>
            </div>

            {/* 検索フォーム */}
            <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
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
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="キーワード、タイトル、著者名..."
                        className="w-full rounded-xl border border-border bg-card py-3.5 pl-12 pr-4 text-base outline-none
              transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground
              transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50">
                        {loading ? "検索中..." : "検索"}
                    </button>
                </div>
            </form>

            {/* エラー表示 */}
            {error && (
                <div className="mx-auto max-w-2xl rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* 検索結果 */}
            {loading && (
                <div className="space-y-4">
                    <div className="animate-pulse space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="glass-card rounded-xl p-5 border border-border/50">
                                <div className="flex flex-col gap-3">
                                    <div className="h-6 w-3/4 bg-muted/50 rounded" />
                                    <div className="h-4 w-1/2 bg-muted/30 rounded" />
                                    <div className="mt-2 space-y-2">
                                        <div className="h-4 w-full bg-muted/20 rounded" />
                                        <div className="h-4 w-5/6 bg-muted/20 rounded" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {hasSearched && !loading && !error && (
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
                                        <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors">
                                            {paper.title}
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {paper.authors.join(", ")}
                                        </p>
                                        <p className="mt-2 text-sm text-muted-foreground/80 line-clamp-2">
                                            {paper.abstract || "要約なし"}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                                            <span className="rounded-md bg-muted px-2 py-1 font-medium">
                                                {paper.venue || "Unknown Venue"}{" "}
                                                {paper.year || ""}
                                            </span>
                                            <span className="text-muted-foreground">
                                                引用:{" "}
                                                {formatCitations(
                                                    paper.citation_count,
                                                )}
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
                                            onClick={() => handleLike(paper)}
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
                                        {/* Project functionality can be added here later */}
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
            )}

            {/* 未検索時 */}
            {!hasSearched && (
                <div className="mt-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <span className="text-3xl">🔬</span>
                    </div>
                    <p className="text-muted-foreground">
                        キーワードを入力して検索を開始してください
                    </p>
                </div>
            )}
        </div>
    );
}
