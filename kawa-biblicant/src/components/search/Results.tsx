import { useState } from "react";
import type { LineageEdge, RankedPaper } from "../../types";
import PaperModal from "../modal/PaperModal";
import ResultsEmpty from "./ResultsEmpty";
import PaperMemoGrid from "../modal/PaperMemoGrid";
import ResultsHeader from "./ResultsHeader";
import ResultsList from "./ResultsList";
import ResultsSkeleton from "./ResultsSkeleton";
import styles from "../Results.module.css";

type ResultsProps = {
  mode: "search" | "memo";
  title: string;
  status: string;
  loading: boolean;
  results: RankedPaper[];
  edges: LineageEdge[];
  memoPapers: RankedPaper[];
  onOpenPdf: (paper: RankedPaper) => void;
};

export default function Results({
  mode,
  title,
  status,
  loading,
  results,
  edges,
  memoPapers,
  onOpenPdf
}: ResultsProps) {
  const [activePaper, setActivePaper] = useState<RankedPaper | null>(null);

  const showSkeleton = mode === "search" && loading;
  const showList = mode === "search" && results.length > 0;
  const showMemoGrid = mode === "memo";
  const showEmpty = mode === "search" && !loading && results.length === 0;
  const closeModal = () => setActivePaper(null);
  return (
    <section className={styles.results}>
      <ResultsHeader title={title} status={status} />
      <div className={styles.resultsBody}>
        {showSkeleton ? (
          <ResultsSkeleton />
        ) : showList ? (
          <ResultsList results={results} edges={edges} onSelect={setActivePaper} />
        ) : showMemoGrid ? (
          <PaperMemoGrid
            memoPapers={memoPapers}
            onSelect={setActivePaper}
            title="メモ済み論文"
          />
        ) : showEmpty ? (
          <ResultsEmpty />
        ) : null}
      </div>
      <PaperModal
        paper={activePaper}
        onClose={closeModal}
        onOpenPdf={onOpenPdf}
        memoPapers={memoPapers}
        onSelectPaper={setActivePaper}
      />
    </section>
  );
}
