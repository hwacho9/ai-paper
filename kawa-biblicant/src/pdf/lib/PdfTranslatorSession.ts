import type { Dispatch, FormEvent } from "react";
import { extractParagraphs, loadPdfDocument } from "./pdf";
import type { LoadState, PageTranslation } from "../types";

type TranslatorState = {
  pdfUrl: string;
  pages: PageTranslation[];
  apiKey: string;
  endpoint: string;
  model: string;
};

type SessionDeps = {
  dispatch: Dispatch<any>;
  getState: () => TranslatorState;
  defaultScale: number;
};

export class PdfTranslatorSession {
  private pdfDoc: any = null;
  private readonly visiblePages = new Set<number>();

  constructor(private readonly deps: SessionDeps) {}

  getPdfDoc() {
    return this.pdfDoc;
  }

  private getState() {
    return this.deps.getState();
  }

  async loadPdf(isActive?: () => boolean) {
    this.deps.dispatch({ type: "set_load_state", payload: { status: "loading" } as LoadState });
    this.deps.dispatch({ type: "set_pages", payload: [] as PageTranslation[] });
    this.deps.dispatch({ type: "set_current_page", payload: 0 });

    try {
      const state = this.getState();
      const pdfDoc = await loadPdfDocument(state.pdfUrl);
      this.pdfDoc = pdfDoc;

      const nextPages: PageTranslation[] = [];
      for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
        const page = await pdfDoc.getPage(pageNumber);
        const pageData = await extractParagraphs({
          page,
          pageNumber,
          scale: this.deps.defaultScale
        });
        nextPages.push(pageData);
      }

      if (isActive && !isActive()) return;
      this.deps.dispatch({ type: "set_pages", payload: nextPages });
      this.deps.dispatch({ type: "set_load_state", payload: { status: "ready" } as LoadState });
    } catch (error: any) {
      if (isActive && !isActive()) return;
      this.deps.dispatch({
        type: "set_load_state",
        payload: { status: "error", message: error?.message ?? "PDF load failed." }
      });
    }
  }

  handleUrlSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  handleParagraphVisible(pageNumber: number, paragraphId: string) {
    void pageNumber;
    void paragraphId;
  }

  handlePageVisible(pageNumber: number) {
    const state = this.getState();
    const page = state.pages.find((entry) => entry.pageNumber === pageNumber);
    if (!page) return;
    if (this.visiblePages.has(pageNumber)) return;
    this.visiblePages.add(pageNumber);
    this.deps.dispatch({ type: "set_current_page", payload: pageNumber });
  }
}
