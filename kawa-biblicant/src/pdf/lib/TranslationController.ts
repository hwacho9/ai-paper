import { TranslatorService } from "./translator";
import { analyzeOcTargetsWithOpenAI } from "./openai";
import { TranslationQueue } from "./TranslationQueue";
import { parseBracketedOcTargets } from "./phraseParse";
import type { PageTranslation, ParagraphTranslation } from "../types";

type TranslatorState = {
  pages: PageTranslation[];
  apiKey: string;
  endpoint: string;
  model: string;
  dependencyEnabled: boolean;
};

type TranslationControllerDeps = {
  dispatch: (action: any) => void;
  getState: () => TranslatorState;
  splitTranslationByRatio: (text: string, ratio: number) => [string, string];
};

export class TranslationController {
  private readonly inFlight = new Set<string>();
  private readonly visiblePages = new Set<number>();
  private translatorService: TranslatorService | null = null;
  private translatorDepsKey = "";
  private enabled = true;
  private readonly translationQueue = new TranslationQueue(10);
  private readonly ocQueue = new TranslationQueue(6);

  constructor(private readonly deps: TranslationControllerDeps) {}

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.translationQueue.clear();
      this.ocQueue.clear();
      this.inFlight.clear();
    }
    if (!enabled) {
      this.inFlight.clear();
      this.visiblePages.clear();
    }
  }

  handlePageVisible(pageNumber: number) {
    // no-op
    if (!this.enabled) return;
    if (this.visiblePages.has(pageNumber)) return;
    this.visiblePages.add(pageNumber);

    const state = this.deps.getState();
    const page = state.pages.find((entry) => entry.pageNumber === pageNumber);
    if (page) void this.translatePage(page);

    const nextPage = state.pages.find((entry) => entry.pageNumber === pageNumber + 1);
    if (nextPage) void this.translatePage(nextPage);
  }

  async handleTranslateAll() {
    if (!this.enabled) return;
    this.deps.dispatch({ type: "set_translating", payload: true });
    const state = this.deps.getState();
    const tasks = state.pages
      .filter((page) => this.visiblePages.has(page.pageNumber))
      .map((page) => this.translatePage(page));
    await Promise.allSettled(tasks);
    this.deps.dispatch({ type: "set_translating", payload: false });
  }

  private async translatePage(page: PageTranslation) {
    if (!this.enabled) return;
    const tasks = page.paragraphs
      .filter((paragraph) => paragraph.status === "idle")
      .map((paragraph) => this.translateParagraph(page.pageNumber, paragraph));
    await Promise.allSettled(tasks);
  }

  private async translateParagraph(pageNumber: number, paragraph: ParagraphTranslation) {
    if ((paragraph.lineCount ?? 1) < 2 || paragraph.isMathLike) return;
    if (!this.enabled) return;
    if (this.inFlight.has(paragraph.id) || this.translationQueue.has(paragraph.id)) return;

    const state = this.deps.getState();
    if (!state.apiKey) {
      this.deps.dispatch({
        type: "set_load_state",
        payload: { status: "error", message: "OpenAI APIキーを入力してください。" }
      });
      return;
    }

    if (!paragraph.text) {
      this.deps.dispatch({
        type: "update_paragraph",
        payload: {
          pageNumber,
          paragraphId: paragraph.id,
          updater: { status: "done", translation: "(テキストが抽出できませんでした)" }
        }
      });
      return;
    }

    try {
      await this.translationQueue.enqueue(paragraph.id, () =>
        this.getTranslatorService().translateSingle(pageNumber, paragraph)
      );
      // no-op
      if (this.deps.getState().dependencyEnabled) {
        void this.analyzeOcTargets(pageNumber, paragraph);
      }
    } catch (error: any) {
      this.markParagraphStatus(pageNumber, paragraph.id, {
        status: "error",
        error: error?.message ?? "Translation failed"
      });
    } finally {
      // no-op
    }
  }

  // queue handled by TranslationQueue

  private markParagraphStatus(
    pageNumber: number,
    paragraphId: string,
    updater: Partial<ParagraphTranslation>
  ) {
    this.deps.dispatch({
      type: "update_paragraph",
      payload: { pageNumber, paragraphId, updater }
    });
  }

  private getMergeGroup(pageNumber: number, mergeGroupId: string) {
    const state = this.deps.getState();
    const page = state.pages.find((entry) => entry.pageNumber === pageNumber);
    if (!page) return [];
    return page.paragraphs
      .filter((entry) => entry.mergeGroupId === mergeGroupId)
      .sort((a, b) => (a.mergeIndex ?? 0) - (b.mergeIndex ?? 0));
  }

  private getTranslatorService() {
    const state = this.deps.getState();
    const nextKey = `${state.endpoint}|${state.apiKey}|${state.model}`;
    if (!this.translatorService || this.translatorDepsKey !== nextKey) {
      this.translatorDepsKey = nextKey;
      this.translatorService = new TranslatorService(
        {
          endpoint: state.endpoint,
          apiKey: state.apiKey,
          model: state.model
        },
        {
          markParagraphStatus: this.markParagraphStatus.bind(this),
          getMergeGroup: this.getMergeGroup.bind(this),
          inFlight: this.inFlight,
          splitTranslationByRatio: this.deps.splitTranslationByRatio
        }
      );
    }
    return this.translatorService;
  }

  private async analyzeOcTargets(pageNumber: number, paragraph: ParagraphTranslation) {
    // no-op
    if (paragraph.ocStatus && paragraph.ocStatus !== "idle") return;
    const state = this.deps.getState();
    if (!state.apiKey) return;
    if (!paragraph.text) return;

    try {
      await this.ocQueue.enqueue(paragraph.id, async () => {
        this.markParagraphStatus(pageNumber, paragraph.id, { ocStatus: "processing" });
        const trimmed = paragraph.text.length > 1200 ? paragraph.text.slice(0, 1200) : paragraph.text;
        const result = await analyzeOcTargetsWithOpenAI({
          endpoint: state.endpoint,
          apiKey: state.apiKey,
          model: state.model,
          text: trimmed
        });
        const targets = parseBracketedOcTargets(result.bracket, result.tokens);
        console.log("[OC] LLM output", {
          pageNumber,
          paragraphId: paragraph.id,
          tokens: result.tokens,
          bracket: result.bracket
        });
        this.markParagraphStatus(pageNumber, paragraph.id, {
          ocTargets: { tokens: result.tokens, bracket: result.bracket, targets },
          ocStatus: "done"
        });
      });
    } catch (error: any) {
      console.log("[OC] LLM error", {
        pageNumber,
        paragraphId: paragraph.id,
        message: error?.message
      });
      this.markParagraphStatus(pageNumber, paragraph.id, {
        ocStatus: "error",
        error: error?.message ?? "OC analysis failed"
      });
    }
  }
}
