/**
 * ライブラリ関連API
 */
import { apiGet, apiPost } from "./client";

const normalizePaperId = (rawId: string): string => {
  let next = rawId;
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(next);
      if (decoded === next) {
        return decoded;
      }
      next = decoded;
    } catch {
      return next;
    }
  }
  return next;
};

const encodePaperId = (paperId: string): string =>
  encodeURIComponent(normalizePaperId(paperId));

const getCanonicalPaperId = (paperId: string): string =>
  normalizePaperId(paperId);

export interface PaperCreate {
    external_id: string;
    source?: string;
    title: string;
    authors: string[];
    year?: number | null;
    venue?: string;
    abstract?: string;
    doi?: string | null;
    arxiv_id?: string | null;
    pdf_url?: string | null;
    url?: string | null;
}

export interface PaperResponse extends PaperCreate {
    id: string; // internal ID
    status: string;
    is_liked: boolean;
    keywords?: string[];
    prerequisite_keywords?: string[];
    created_at?: string;
    updated_at?: string;
}

export interface PaperListResponse {
    papers: PaperResponse[];
    total: number;
}

export function toggleLike(
    paperId: string,
    data: PaperCreate,
): Promise<boolean> {
    const normalizedPaperId = getCanonicalPaperId(paperId);
    const paperData: PaperCreate = {
        ...data,
        external_id: normalizedPaperId,
    };

    return apiPost<boolean>(
        `/api/v1/library/${encodePaperId(normalizedPaperId)}/like`,
        paperData,
    );
}

export function getLibrary(): Promise<PaperListResponse> {
    return apiGet<PaperListResponse>("/api/v1/library");
}

export function ingestPaper(paperId: string): Promise<void> {
    return apiPost<void>(
        `/api/v1/papers/${encodePaperId(paperId)}/ingest`,
    );
}
