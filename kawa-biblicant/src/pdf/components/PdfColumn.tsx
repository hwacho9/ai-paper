import { useRef } from "react";
import styles from "../PdfTranslatorApp.module.css";
import type { LoadState, PageTranslation } from "../types";
import PdfPage from "./PdfPage";

type PdfColumnProps = {
  hasPdfUrl: boolean;
  loadState: LoadState;
  pages: PageTranslation[];
  pdfDoc: any;
  scale: number;
  showTranslations: boolean;
  showDependencies: boolean;
  onParagraphVisible: (pageNumber: number, paragraphId: string) => void;
  onPageVisible: (pageNumber: number) => void;
};

export default function PdfColumn({
  hasPdfUrl,
  loadState,
  pages,
  pdfDoc,
  scale,
  showTranslations,
  showDependencies,
  onParagraphVisible,
  onPageVisible
}: PdfColumnProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className={styles.pdfColumn}>
      <div className={styles.pdfContainer} ref={containerRef}>
        {!hasPdfUrl && <div className={styles.emptyState}>PDF URLが指定されていません。</div>}
        {loadState.status === "loading" && (
          <div className={styles.emptyState}>PDFを読み込んでいます...</div>
        )}
        {loadState.status === "error" && (
          <div className={styles.emptyState}>{loadState.message}</div>
        )}
        {loadState.status === "ready" &&
          pages.map((page) => (
            <PdfPage
              key={page.pageNumber}
              page={page}
              pdfDoc={pdfDoc}
              scale={scale}
              rootRef={containerRef}
              showTranslations={showTranslations}
              showDependencies={showDependencies}
              onParagraphVisible={onParagraphVisible}
              onPageVisible={onPageVisible}
            />
          ))}
      </div>
    </div>
  );
}
