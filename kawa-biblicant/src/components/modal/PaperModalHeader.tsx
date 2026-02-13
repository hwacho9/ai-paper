import type { RankedPaper } from "../../types";
import styles from "../Results.module.css";

type PaperModalHeaderProps = {
  paper: RankedPaper;
  onClose: () => void;
};

export default function PaperModalHeader({ paper, onClose }: PaperModalHeaderProps) {
  return (
    <div className={styles.modalHeader}>
      <div>
        <p className={styles.rank}>#{paper.rank}</p>
        <h3 className={styles.paperTitle}>{paper.title}</h3>
        <p className={styles.meta}>
          {paper.year} · {paper.venue}
        </p>
      </div>
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  );
}
