import type { RankedPaper } from "../../types";
import styles from "../Results.module.css";

type PaperModalDetailsProps = {
  paper: RankedPaper;
};

export default function PaperModalDetails({ paper }: PaperModalDetailsProps) {
  return (
    <div className={styles.modalBody}>
      <div className={styles.modalThumbRow}>
        <div className={styles.modalThumbnailFrame}>
          <img
            src={paper.imageUrl}
            alt={`${paper.title} のサムネイル`}
            className={styles.modalThumbnail}
            loading="lazy"
          />
        </div>
      </div>
      <div>
        <p className={styles.sectionLabel}>概要</p>
        <p className={styles.overview}>{paper.summary}</p>
      </div>
      <div>
        <p className={styles.sectionLabel}>キーワード</p>
        <div className={styles.keywordList}>
          {paper.keywords.map((keyword) => (
            <span key={keyword} className={styles.keywordChip}>
              {keyword}
            </span>
          ))}
        </div>
      </div>
      {paper.prereqKeywords.length > 0 && (
        <div>
          <p className={styles.sectionLabel}>事前知識</p>
          <div className={styles.keywordList}>
            {paper.prereqKeywords.map((keyword) => (
              <span key={keyword} className={styles.keywordChip}>
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
