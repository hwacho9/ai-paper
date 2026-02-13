import { forwardRef } from "react";
import type { PageTranslation } from "../types";
import PdfDependencyOverlay from "./PdfDependencyOverlay";
import PdfTranslationOverlay from "./PdfTranslationOverlay";

type PdfOverlayProps = {
  page: PageTranslation;
  width?: number;
  height?: number;
  showTranslations: boolean;
  showDependencies: boolean;
};

const PdfOverlay = forwardRef<HTMLDivElement, PdfOverlayProps>(
  ({ page, width, height, showTranslations, showDependencies }, ref) => (
    <div ref={ref}>
      <PdfTranslationOverlay
        page={page}
        width={width}
        height={height}
        showTranslations={showTranslations}
      />
      <PdfDependencyOverlay
        page={page}
        width={width}
        height={height}
        showDependencies={showDependencies}
      />
    </div>
  )
);

PdfOverlay.displayName = "PdfOverlay";

export default PdfOverlay;
