import type { ParagraphTranslation } from "../types";
import { translateWithOpenAI } from "./openai";

export type TranslatorDeps = {
  endpoint: string;
  apiKey: string;
  model: string;
};

export type TranslationHelpers = {
  markParagraphStatus: (
    pageNumber: number,
    paragraphId: string,
    updater: Partial<ParagraphTranslation>
  ) => void;
  getMergeGroup: (pageNumber: number, mergeGroupId: string) => ParagraphTranslation[];
  inFlight: Set<string>;
  splitTranslationByRatio: (text: string, ratio: number) => [string, string];
};

export class TranslatorService {
  constructor(
    private readonly deps: TranslatorDeps,
    private readonly helpers: TranslationHelpers
  ) {}

  async translateMergeGroup(
    pageNumber: number,
    paragraph: ParagraphTranslation,
    group: ParagraphTranslation[]
  ) {
    if ((paragraph.mergeIndex ?? 0) !== 0) return true;
    if (group.some((entry) => entry.status === "translating")) return true;
    if (this.helpers.inFlight.has(group[0].id) || this.helpers.inFlight.has(group[1].id)) {
      return true;
    }
    this.helpers.inFlight.add(group[0].id);
    this.helpers.inFlight.add(group[1].id);

    this.helpers.markParagraphStatus(pageNumber, group[0].id, { status: "translating" });
    this.helpers.markParagraphStatus(pageNumber, group[1].id, { status: "translating" });

    try {
      const combinedText = `${group[0].text} ${group[1].text}`.trim();
      const translation = await translateWithOpenAI({
        endpoint: this.deps.endpoint,
        apiKey: this.deps.apiKey,
        model: this.deps.model,
        text: combinedText
      });
      const totalLength = group[0].text.length + group[1].text.length;
      const ratio = totalLength === 0 ? 0.5 : group[0].text.length / totalLength;
      const [firstPart, secondPart] = this.helpers.splitTranslationByRatio(translation, ratio);

      this.helpers.markParagraphStatus(pageNumber, group[0].id, {
        status: "done",
        translation: firstPart
      });
      this.helpers.markParagraphStatus(pageNumber, group[1].id, {
        status: "done",
        translation: secondPart
      });
    } catch (error: any) {
      this.helpers.markParagraphStatus(pageNumber, group[0].id, {
        status: "error",
        error: error?.message ?? "Translation failed"
      });
      this.helpers.markParagraphStatus(pageNumber, group[1].id, {
        status: "error",
        error: error?.message ?? "Translation failed"
      });
    } finally {
      this.helpers.inFlight.delete(group[0].id);
      this.helpers.inFlight.delete(group[1].id);
    }

    return true;
  }

  async translateSingle(pageNumber: number, paragraph: ParagraphTranslation) {
    if (this.helpers.inFlight.has(paragraph.id)) return;
    this.helpers.inFlight.add(paragraph.id);
    this.helpers.markParagraphStatus(pageNumber, paragraph.id, { status: "translating" });

    try {
      const translation = await translateWithOpenAI({
        endpoint: this.deps.endpoint,
        apiKey: this.deps.apiKey,
        model: this.deps.model,
        text: paragraph.text
      });
      this.helpers.markParagraphStatus(pageNumber, paragraph.id, {
        status: "done",
        translation
      });
    } finally {
      this.helpers.inFlight.delete(paragraph.id);
    }
  }
}
