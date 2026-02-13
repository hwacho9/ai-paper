import type { RankedPaper } from "../../types";
import styles from "../Results.module.css";

type ResultsItemProps = {
  paper: RankedPaper;
  depth: number;
  improvement: string;
  onSelect: (paper: RankedPaper) => void;
};

export default function ResultsItem({
  paper,
  depth,
  improvement,
  onSelect
}: ResultsItemProps) {
  return (
    <li>
      <button
        type="button"
        className={styles.resultLink}
        style={{ paddingLeft: `${depth * 24}px` }}
        onClick={() => onSelect(paper)}
      >
        {depth > 0 && improvement && (
          <div className={styles.indentMeta}>
            <span className={styles.indentArrow}>↳</span>
            <span className={styles.indentText}>{improvement}</span>
          </div>
        )}
        <div className={styles.resultCard}>
          <div className={styles.thumbnailFrame}>
            <img
              src={paper.imageUrl}
              alt={`${paper.title} のサムネイル`}
              className={styles.thumbnail}
              loading="lazy"
            />
          </div>
          <div>
            <h3 className={styles.paperTitle}>{paper.title}</h3>
            <p className={styles.meta}>{paper.year}</p>
            <p className={styles.overview}>{paper.summary}</p>
          </div>
        </div>
      </button>
    </li>
  );
}
