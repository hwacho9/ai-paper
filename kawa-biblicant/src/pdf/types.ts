export type ParagraphTranslation = {
  id: string;
  text: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  translation: string;
  status: "idle" | "translating" | "done" | "error" | "skipped";
  error?: string;
  mergeGroupId?: string;
  mergeIndex?: number;
  lineCount?: number;
  isMathLike?: boolean;
  ocStatus?: "idle" | "processing" | "done" | "error";
  ocTargets?: {
    tokens: string[];
    bracket: string;
    targets: { role: "O" | "C"; start: number; end: number }[];
  };
  tokenPositions?: { token: string; x: number; y: number; width: number; height: number }[];
};

export type PageTranslation = {
  pageNumber: number;
  paragraphs: ParagraphTranslation[];
};

export type LoadState = {
  status: "idle" | "loading" | "ready" | "error";
  message?: string;
};
