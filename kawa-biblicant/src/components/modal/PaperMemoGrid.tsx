import type { RankedPaper } from "../../types";
import PaperMemoItem from "./PaperMemoItem";
import styles from "../Results.module.css";

type PaperMemoGridProps = {
  memoPapers: RankedPaper[];
  onSelect: (paper: RankedPaper) => void;
  title?: string;
};

export default function PaperMemoGrid({
  memoPapers,
  onSelect,
  title
}: PaperMemoGridProps) {
  return (
    <div className={styles.memoSection}>
      {title && <p className={styles.sectionLabel}>{title}</p>}
      <div className={styles.memoGrid}>
        {memoPapers.map((memo) => (
          <PaperMemoItem key={memo.title} memo={memo} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
