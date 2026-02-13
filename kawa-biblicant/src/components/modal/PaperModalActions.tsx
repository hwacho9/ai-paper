import type { RankedPaper } from "../../types";
import styles from "../Results.module.css";

type PaperModalActionsProps = {
  paper: RankedPaper;
  onOpenPdf: (paper: RankedPaper) => void;
};

export default function PaperModalActions({ paper, onOpenPdf }: PaperModalActionsProps) {
  return (
    <div className={styles.modalActions}>
      <button
        type="button"
        className={`${styles.buttonBase} ${styles.primaryButton}`}
        onClick={() => onOpenPdf(paper)}
      >
        論文を読む
      </button>
      <button type="button" className={`${styles.buttonBase} ${styles.secondaryButton}`}>
        メモに追加
      </button>
    </div>
  );
}
