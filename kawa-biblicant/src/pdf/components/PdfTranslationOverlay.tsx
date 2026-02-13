import styles from "../PdfTranslatorApp.module.css";
import type { PageTranslation } from "../types";

type PdfTranslationOverlayProps = {
  page: PageTranslation;
  width?: number;
  height?: number;
  showTranslations: boolean;
};

export default function PdfTranslationOverlay({
  page,
  width,
  height,
  showTranslations
}: PdfTranslationOverlayProps) {
  if (!showTranslations) return null;

  return (
    <div
      className={styles.overlay}
      style={{ width: width || undefined, height: height || undefined }}
    >
      {page.paragraphs
        .filter((paragraph) => (paragraph.lineCount ?? 1) >= 2 && !paragraph.isMathLike)
        .map((paragraph) => {
          const lineCount = paragraph.lineCount ?? 1;
          const displayText = paragraph.translation || "";
          const fontSize = calculateFontSize(paragraph, lineCount, displayText);
          return (
            <div
              key={paragraph.id}
              className={styles.paragraphOverlay}
              data-page={page.pageNumber}
              data-paragraph-id={paragraph.id}
              data-hide-on-hover={
                Boolean(paragraph.translation) || paragraph.status === "translating"
              }
              data-status={paragraph.status}
              style={{
                left: paragraph.bbox.x,
                top: paragraph.bbox.y,
                width: paragraph.bbox.width,
                minHeight: paragraph.bbox.height
              }}
            >
              <span className={styles.paragraphText} style={{ fontSize, lineHeight: 1.2 }}>
                {displayText}
              </span>
            </div>
          );
        })}
    </div>
  );
}

function calculateFontSize(
  paragraph: PageTranslation["paragraphs"][number],
  lineCount: number,
  displayText: string
) {
  const characters = displayText.length > 0 ? displayText : paragraph.text;
  const asciiCount = (characters.match(/[\x00-\x7F]/g) ?? []).length;
  const nonAsciiCount = characters.length - asciiCount;
  const effectiveChars = asciiCount * 0.6 + nonAsciiCount * 1.0;
  const charsPerLine = Math.max(1, Math.ceil(effectiveChars / lineCount));
  const fontSizeByHeight = paragraph.bbox.height / (lineCount * 1.35);
  const fontSizeByWidth = paragraph.bbox.width / Math.max(1, charsPerLine);
  return Math.max(3, Math.min(fontSizeByHeight, fontSizeByWidth));
}
