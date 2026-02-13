import type { RankedPaper } from "../../types";
import styles from "../Results.module.css";

type PaperMemoItemProps = {
  memo: RankedPaper;
  onSelect: (paper: RankedPaper) => void;
};

export default function PaperMemoItem({ memo, onSelect }: PaperMemoItemProps) {
  return (
    <button
      key={memo.title}
      type="button"
      className={styles.memoCard}
      onClick={() => onSelect(memo)}
    >
      <div className={styles.memoThumb}>
        <img src={memo.imageUrl} alt={`${memo.title} のサムネイル`} loading="lazy" />
      </div>
      <div className={styles.memoMeta}>
        <span>{memo.year}</span>
        <span>・{memo.venue}</span>
      </div>
      <p className={styles.memoTitle}>{memo.title}</p>
    </button>
  );
}
