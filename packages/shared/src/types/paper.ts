// 共有型定義 - 論文（Paper）

/** 論文の処理状態 */
export type PaperStatus = "PENDING" | "INGESTING" | "READY" | "FAILED";

/** 論文メタデータ */
export interface Paper {
  id: string;
  ownerUid: string;
  title: string;
  authors: string[];
  year?: number;
  venue: string;
  doi?: string;
  arxivId?: string;
  abstract: string;
  pdfUrl?: string;
  status: PaperStatus;
  isLiked: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** いいね */
export interface Like {
  paperId: string;
  ownerUid: string;
  createdAt: string;
}

/** 論文チャンク */
export interface PaperChunk {
  paperId: string;
  chunkId: string;
  section: string;
  text: string;
  pageRange: [number, number];
  offset: number;
  tokenCount?: number;
}

/** 検索結果 */
export interface SearchResultItem {
  externalId: string;
  source: string;
  title: string;
  authors: string[];
  year?: number;
  venue: string;
  abstract: string;
  doi?: string;
  arxivId?: string;
  pdfUrl?: string;
  citationCount?: number;
  isInLibrary: boolean;
}
