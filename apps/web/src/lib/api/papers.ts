/**
 * ライブラリ関連API
 */
import { apiGet, apiPost } from "./client";

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
}

export interface PaperResponse extends PaperCreate {
  id: string; // internal ID
  status: string;
  is_liked: boolean;
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
  return apiPost<boolean>(`/api/v1/library/${paperId}/like`, data);
}

export function getLibrary(): Promise<PaperListResponse> {
  return apiGet<PaperListResponse>("/api/v1/library");
}
