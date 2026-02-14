"use client";

/**
 * 論文検索ページ
 * 検索フォーム + フィルター + 結果グリッド
 */

import { useState, useEffect, useRef } from "react";
import {
  searchPapers,
  SearchResultItem,
  toggleLike,
  PaperCreate,
} from "@/lib/api";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "sonner";

const SEARCH_HISTORY_KEY = "paper-search-history";
const MAX_HISTORY_ITEMS = 10;
const SEARCH_SOURCE_KEY = "paper-search-source";
const SOURCE_OPTIONS = [
  { value: "auto", label: "Auto（分野優先）" },
  { value: "all", label: "All（統合）" },
  { value: "arxiv", label: "ArXiv" },
  { value: "pubmed", label: "PubMed" },
  { value: "scholar", label: "Google Scholar" },
] as const;

type SearchSource = (typeof SOURCE_OPTIONS)[number]["value"];

function formatCitations(count: number | null): string {
  if (!count) return "0";
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function loadSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(history: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    console.warn("Failed to save search history");
  }
}

export default function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchSource, setSearchSource] = useState<SearchSource>("auto");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 初期化時に検索履歴を読み込む
  useEffect(() => {
    setSearchHistory(loadSearchHistory());
    const storedSource = localStorage.getItem(SEARCH_SOURCE_KEY);
    if (
      storedSource &&
      (SOURCE_OPTIONS.map((option) => option.value) as readonly string[]).includes(
        storedSource,
      )
    ) {
      setSearchSource(storedSource as SearchSource);
    }
  }, []);

  // クリックアウトでサジェストを非表示
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions = searchHistory.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // 検索履歴に追加
    const trimmedQuery = query.trim();
    let newHistory = [
      trimmedQuery,
      ...searchHistory.filter((q) => q !== trimmedQuery),
    ];
    newHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);
    setSearchHistory(newHistory);
    saveSearchHistory(newHistory);

    setLoading(true);
    setError("");
    setHasSearched(true);
    setShowSuggestions(false);

    try {
      const data = await searchPapers({
        q: trimmedQuery,
        source: searchSource,
        limit: 20,
      });
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
        isLiked ? "ライブラリに追加しました" : "ライブラリから削除しました",
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
          ArXiv / PubMed / Scholar から分野別に最適化して検索します
        </p>
      </div>

      {/* 検索フォーム */}
      <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
        <div className="relative space-y-2">
          <div className="rounded-xl border border-border bg-card px-3 py-2 flex items-stretch gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="キーワード、タイトル、著者名..."
              className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 min-w-[5rem] items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
            >
              {loading ? "検索中..." : "検索"}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="text-sm text-muted-foreground mr-2 self-center">
              検索ソース
            </label>
            <div className="inline-flex rounded-lg border border-border bg-card/60 p-1">
              {SOURCE_OPTIONS.map((option) => {
                const selected = searchSource === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const nextSource = option.value;
                      setSearchSource(nextSource);
                      localStorage.setItem(SEARCH_SOURCE_KEY, nextSource);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 検索履歴サジェスト */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 z-10 mt-2 rounded-xl border border-border bg-card shadow-lg"
            >
              <div className="max-h-64 overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary/10 transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-border/50 last:border-b-0 flex items-center gap-2"
                  >
                    <svg
                      className="h-4 w-4 text-muted-foreground flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    <span className="flex-1">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
                className="glass-card rounded-xl p-5 border border-border/50"
              >
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
                className="glass-card group rounded-xl p-5 transition-all duration-200 hover:border-primary/30"
              >
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
                        {paper.venue || "Unknown Venue"} {paper.year || ""}
                      </span>
                      <span className="text-muted-foreground">
                        引用: {formatCitations(paper.citation_count)}
                      </span>
                      {paper.pdf_url && (
                        <a
                          href={paper.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
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
                      }
                    >
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
