"use client";

/**
 * 論文検索ページ
 * 状態管理とイベントハンドラのみを担当し、表示はコンポーネントへ委譲する。
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
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";

export default function SearchPage() {
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [yearFrom, setYearFrom] = useState("");
    const [yearTo, setYearTo] = useState("");
    const [author, setAuthor] = useState("");
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError("");
        setHasSearched(true);

        try {
            const parsedYearFrom = yearFrom.trim() ? Number(yearFrom) : undefined;
            const parsedYearTo = yearTo.trim() ? Number(yearTo) : undefined;
            const data = await searchPapers({
                q: query,
                year_from:
                    parsedYearFrom !== undefined &&
                    Number.isFinite(parsedYearFrom)
                        ? parsedYearFrom
                        : undefined,
                year_to:
                    parsedYearTo !== undefined && Number.isFinite(parsedYearTo)
                        ? parsedYearTo
                        : undefined,
                author: author.trim() || undefined,
                limit: 20,
            });
            setResults(data.results);
        } catch (err: unknown) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "検索中にエラーが発生しました",
            );
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
            setResults(originalResults);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold">
                    <span className="gradient-text">論文を検索</span>
                </h2>
                <p className="mt-2 text-muted-foreground">
                    Geminiベースで関連論文を検索できます
                </p>
            </div>

            <SearchForm
                query={query}
                onChangeQuery={setQuery}
                loading={loading}
                onSubmit={handleSearch}
                showAdvanced={showAdvanced}
                onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
                yearFrom={yearFrom}
                onChangeYearFrom={setYearFrom}
                yearTo={yearTo}
                onChangeYearTo={setYearTo}
                author={author}
                onChangeAuthor={setAuthor}
            />

            {error && (
                <div className="mx-auto max-w-2xl rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            <SearchResults
                loading={loading}
                hasSearched={hasSearched}
                error={error}
                results={results}
                onLike={handleLike}
            />

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
