import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import styles from "./App.module.css";
import Footer from "./components/layout/Footer";
import Results from "./components/search/Results";
import SearchForm from "./components/search/SearchForm";
import {
  LINEAGE_EDGES,
  MOCK_MEMO_RESULT,
  MOCK_RESULTS,
  SUGGESTED_TOPICS
} from "./data/mock";
import type { RankedPaper } from "./types";

export default function App() {
  const [theme, setTheme] = useState("");
  const [submittedTheme, setSubmittedTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "memo">("search");

  const rankedMock = useMemo<RankedPaper[]>(
    () =>
      MOCK_RESULTS.map((item, index) => ({
        ...item,
        rank: index + 1
      })),
    []
  );
  const results = submittedTheme ? rankedMock : [];
  const memoResults = useMemo<RankedPaper[]>(
    () =>
      MOCK_MEMO_RESULT.map((item, index) => ({
        ...item,
        rank: index + 1
      })),
    []
  );
  const isSearchTab = activeTab === "search";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!theme.trim()) return;
    setLoading(true);
    setSubmittedTheme(theme.trim());
    setTimeout(() => setLoading(false), 650);
  };

  const handleOpenPdf = (paper: RankedPaper) => {
    const encoded = encodeURIComponent(paper.pdfUrl);
    const runtime = (globalThis as { chrome?: { runtime?: { getURL?: (path: string) => string } } })
      .chrome?.runtime;
    const targetUrl = runtime?.getURL
      ? runtime.getURL(`viewer.html?src=${encoded}`)
      : paper.pdfUrl;
    window.open(targetUrl, "_blank", "noopener");
  };

  return (
    <div className={styles.page}>
      <main className={styles.panel}>
        <div className={styles.tabRow}>
          <button
            type="button"
            className={styles.tabButton}
            data-active={isSearchTab}
            onClick={() => setActiveTab("search")}
          >
            検索
          </button>
          <button
            type="button"
            className={styles.tabButton}
            data-active={!isSearchTab}
            onClick={() => setActiveTab("memo")}
          >
            メモ済み論文
          </button>
        </div>

        {isSearchTab ? (
          <>
            <SearchForm
              theme={theme}
              loading={loading}
              suggestions={SUGGESTED_TOPICS}
              submittedTheme={submittedTheme}
              onThemeChange={setTheme}
              onSubmit={handleSubmit}
              onSuggestionSelect={setTheme}
            />
            <Results
              mode="search"
              title="重要論文"
              status={
                submittedTheme
                  ? `"${submittedTheme}" の結果 (モック)`
                  : "テーマを入力すると結果が表示されます"
              }
              loading={loading}
              results={results}
              edges={LINEAGE_EDGES}
              memoPapers={memoResults}
              onOpenPdf={handleOpenPdf}
            />
          </>
        ) : (
          <Results
            mode="memo"
            title="メモ済み論文"
            status="保存済みの論文一覧"
            loading={false}
            results={memoResults}
            edges={LINEAGE_EDGES}
            memoPapers={memoResults}
            onOpenPdf={handleOpenPdf}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
