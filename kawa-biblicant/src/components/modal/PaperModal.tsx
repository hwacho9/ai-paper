import { useRef } from "react";
import type { RankedPaper } from "../../types";
import PaperModalActions from "./PaperModalActions";
import PaperModalDetails from "./PaperModalDetails";
import PaperModalHeader from "./PaperModalHeader";
import PaperMemoGrid from "./PaperMemoGrid";
import styles from "../Results.module.css";

type PaperModalProps = {
  paper: RankedPaper | null;
  onClose: () => void;
  onOpenPdf: (paper: RankedPaper) => void;
  memoPapers: RankedPaper[];
  onSelectPaper: (paper: RankedPaper) => void;
};

export default function PaperModal({
  paper,
  onClose,
  onOpenPdf,
  memoPapers,
  onSelectPaper
}: PaperModalProps) {
  if (!paper) return null;
  const contentRef = useRef<HTMLDivElement | null>(null);

  const handleSelectPaper = (nextPaper: RankedPaper) => {
    onSelectPaper(nextPaper);
    requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    });
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <PaperModalHeader paper={paper} onClose={onClose} />
        <div className={styles.modalContent} ref={contentRef}>
          <PaperModalDetails paper={paper} />
          {memoPapers.length > 0 && (
            <PaperMemoGrid
              memoPapers={memoPapers}
              onSelect={handleSelectPaper}
              title="関連するメモ済み論文"
            />
          )}
        </div>
        <PaperModalActions paper={paper} onOpenPdf={onOpenPdf} />
      </div>
      <button
        type="button"
        className={styles.modalBackdrop}
        aria-label="閉じる"
        onClick={onClose}
      />
    </div>
  );
}
