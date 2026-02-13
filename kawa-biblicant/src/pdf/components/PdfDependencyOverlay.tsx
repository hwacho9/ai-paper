import styles from "../PdfTranslatorApp.module.css";
import type { PageTranslation, ParagraphTranslation } from "../types";

type PdfDependencyOverlayProps = {
  page: PageTranslation;
  width?: number;
  height?: number;
  showDependencies: boolean;
};

export default function PdfDependencyOverlay({
  page,
  width,
  height,
  showDependencies
}: PdfDependencyOverlayProps) {
  if (!showDependencies) return null;

  const eligibleParagraphs = page.paragraphs.filter(
    (paragraph) => (paragraph.lineCount ?? 1) >= 2 && !paragraph.isMathLike
  );

  return (
    <div
      className={styles.overlay}
      style={{ width: width || undefined, height: height || undefined }}
    >
      {eligibleParagraphs.map((paragraph) =>
        renderParagraphOverlay(paragraph, page.pageNumber)
      )}
    </div>
  );
}

function renderParagraphOverlay(paragraph: ParagraphTranslation, pageNumber: number) {
  const showShell = paragraph.ocStatus === "processing" || paragraph.ocStatus === "error";
  const hasTargets = paragraph.ocTargets && paragraph.ocTargets.targets.length > 0;
  if (!showShell && !hasTargets) return null;

  const layout = buildTokenLayout(paragraph);

  return (
    <div
      key={paragraph.id}
      className={styles.paragraphOverlay}
      data-page={pageNumber}
      data-paragraph-id={paragraph.id}
      data-status={paragraph.status}
      data-dependency-only="true"
      data-oc-status={paragraph.ocStatus ?? "idle"}
      style={{
        left: paragraph.bbox.x,
        top: paragraph.bbox.y,
        width: paragraph.bbox.width,
        minHeight: paragraph.bbox.height
      }}
    >
      {renderTargets(paragraph, layout)}
    </div>
  );
}

function buildTokenLayout(paragraph: ParagraphTranslation) {
  const tokens = paragraph.ocTargets?.tokens ?? [];
  const tokenCount = tokens.length || 1;
  const positions = paragraph.tokenPositions ?? [];
  const hasPositions = positions.length >= tokenCount;
  const tokenWeights = tokens.map((token) => Math.max(1, token.length));
  const totalWeight = tokenWeights.reduce((sum, value) => sum + value, 0);
  const unit = totalWeight > 0 ? paragraph.bbox.width / totalWeight : 0;
  const tokenStart = (index: number) =>
    tokenWeights.slice(0, index).reduce((sum, value) => sum + value, 0) * unit;
  const tokenSpan = (start: number, end: number) =>
    tokenWeights.slice(start, end + 1).reduce((sum, value) => sum + value, 0) * unit;

  return {
    tokens,
    tokenCount,
    positions,
    hasPositions,
    tokenStart,
    tokenSpan
  };
}

function renderTargets(
  paragraph: ParagraphTranslation,
  layout: ReturnType<typeof buildTokenLayout>
) {
  if (!paragraph.ocTargets) return null;
  return paragraph.ocTargets.targets.map((target, idx) => {
    const start = Math.max(0, Math.min(target.start, layout.tokenCount - 1));
    const end = Math.max(start, Math.min(target.end, layout.tokenCount - 1));
    const left = layout.hasPositions
      ? layout.positions[start].x - paragraph.bbox.x
      : layout.tokenStart(start);
    const widthSpan = layout.hasPositions
      ? layout.positions[end].x - paragraph.bbox.x + layout.positions[end].width - left
      : layout.tokenSpan(start, end);
    const top = layout.hasPositions
      ? layout.positions[start].y - layout.positions[start].height - paragraph.bbox.y
      : 2;
    const heightSpan = layout.hasPositions
      ? Math.max(10, layout.positions[start].height)
      : Math.max(12, paragraph.bbox.height * 0.22);
    return (
      <div
        key={`${paragraph.id}-${idx}`}
        className={styles.ocHighlight}
        data-oc={target.role}
        style={{
          left,
          width: widthSpan,
          top,
          height: heightSpan
        }}
      />
    );
  });
}
