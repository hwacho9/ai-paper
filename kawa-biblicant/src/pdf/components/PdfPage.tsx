import React from "react";
import styles from "../PdfTranslatorApp.module.css";
import { renderPageToCanvas } from "../lib/pdf";
import type { PageTranslation } from "../types";
import PdfOverlay from "./PdfOverlay";

type PdfPageProps = {
  page: PageTranslation;
  pdfDoc: any;
  scale: number;
  rootRef: React.RefObject<HTMLDivElement>;
  showTranslations: boolean;
  showDependencies: boolean;
  onParagraphVisible: (pageNumber: number, paragraphId: string) => void;
  onPageVisible: (pageNumber: number) => void;
};

type PdfPageState = {
  width: number;
  height: number;
};

export default class PdfPage extends React.Component<PdfPageProps, PdfPageState> {
  private canvasRef = React.createRef<HTMLCanvasElement>();
  private overlayRef = React.createRef<HTMLDivElement>();
  private containerRef = React.createRef<HTMLDivElement>();
  private paragraphObserver: IntersectionObserver | null = null;
  private pageObserver: IntersectionObserver | null = null;
  private renderToken = 0;
  private lastTranslatedCount = -1;

  state: PdfPageState = {
    width: 0,
    height: 0
  };

  componentDidMount() {
    this.renderPdfPage();
    this.setupParagraphObserver();
    this.setupPageObserver();
  }

  componentDidUpdate(prevProps: PdfPageProps) {
    const pdfChanged =
      prevProps.pdfDoc !== this.props.pdfDoc ||
      prevProps.page.pageNumber !== this.props.page.pageNumber ||
      prevProps.scale !== this.props.scale;

    if (pdfChanged) {
      this.renderPdfPage();
    }

    if (
      prevProps.page.pageNumber !== this.props.page.pageNumber ||
      prevProps.page.paragraphs !== this.props.page.paragraphs ||
      prevProps.onParagraphVisible !== this.props.onParagraphVisible
    ) {
      this.setupParagraphObserver();
      this.logTranslationState();
    }

    if (
      prevProps.page.pageNumber !== this.props.page.pageNumber ||
      prevProps.onPageVisible !== this.props.onPageVisible ||
      prevProps.rootRef !== this.props.rootRef
    ) {
      this.setupPageObserver();
    }
  }

  componentWillUnmount() {
    this.disconnectObservers();
  }

  private disconnectObservers() {
    this.paragraphObserver?.disconnect();
    this.paragraphObserver = null;
    this.pageObserver?.disconnect();
    this.pageObserver = null;
  }

  private async renderPdfPage() {
    if (!this.props.pdfDoc || !this.canvasRef.current) return;

    const token = ++this.renderToken;
    const pdfPage = await this.props.pdfDoc.getPage(this.props.page.pageNumber);
    const result = await renderPageToCanvas({
      page: pdfPage,
      canvas: this.canvasRef.current,
      scale: this.props.scale
    });

    if (token !== this.renderToken) return;
    this.setState({ width: result.width, height: result.height });
  }

  private setupParagraphObserver() {
    if (!this.overlayRef.current) return;
    this.paragraphObserver?.disconnect();

    this.paragraphObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          const paragraphId = target.dataset.paragraphId;
          if (paragraphId) {
            this.props.onParagraphVisible(this.props.page.pageNumber, paragraphId);
            this.paragraphObserver?.unobserve(target);
          }
        });
      },
      { root: this.props.rootRef.current, threshold: 0.2 }
    );

    const nodes = this.overlayRef.current.querySelectorAll(
      `[data-page="${this.props.page.pageNumber}"]`
    );
    nodes.forEach((node) => this.paragraphObserver?.observe(node));
  }

  private setupPageObserver() {
    if (!this.containerRef.current) return;
    this.pageObserver?.disconnect();

    this.pageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.props.onPageVisible(this.props.page.pageNumber);
            this.pageObserver?.disconnect();
          }
        });
      },
      { root: this.props.rootRef.current, threshold: 0.15 }
    );

    this.pageObserver.observe(this.containerRef.current);
  }

  private logTranslationState() {
    const { page } = this.props;
    const translatedCount = page.paragraphs.filter((p) => Boolean(p.translation)).length;
    if (translatedCount === this.lastTranslatedCount) return;
    this.lastTranslatedCount = translatedCount;
    const sample = page.paragraphs.slice(0, 3).map((p) => ({
      id: p.id,
      status: p.status,
      hasTranslation: Boolean(p.translation),
      translationLength: p.translation?.length ?? 0
    }));
    console.log("[PdfPage] translation state", {
      page: page.pageNumber,
      translatedCount,
      total: page.paragraphs.length,
      sample
    });
  }

  render() {
    const { page } = this.props;
    const { width, height } = this.state;

    return (
      <div
        ref={this.containerRef}
        className={styles.pageWrapper}
        style={{ width: width || undefined }}
      >
        <canvas ref={this.canvasRef} className={styles.canvas} />
        <PdfOverlay
          ref={this.overlayRef}
          page={page}
          width={width || undefined}
          height={height || undefined}
          showTranslations={this.props.showTranslations}
          showDependencies={this.props.showDependencies}
        />
      </div>
    );
  }
}
