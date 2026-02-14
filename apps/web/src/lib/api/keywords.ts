/**
 * キーワード関連API
 */
import { apiDelete, apiGet, apiPost } from "./client";

export interface KeywordCreate {
  label: string;
  description?: string;
}

export interface KeywordResponse {
  id: string;
  owner_uid: string;
  label: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface KeywordListResponse {
  keywords: KeywordResponse[];
  total: number;
}

export interface PaperKeywordTagCreate {
  keyword_id: string;
  confidence?: number | null;
}

export interface PaperKeywordResponse {
  paper_id: string;
  keyword_id: string;
  label: string;
  description: string;
  confidence: number;
  source: string;
}

export interface PaperKeywordListResponse {
  keywords: PaperKeywordResponse[];
  total: number;
}

export function createKeyword(data: KeywordCreate): Promise<KeywordResponse> {
  return apiPost<KeywordResponse>("/api/v1/keywords", data);
}

export function listKeywords(): Promise<KeywordListResponse> {
  return apiGet<KeywordListResponse>("/api/v1/keywords");
}

export function listPaperKeywords(paperId: string): Promise<PaperKeywordListResponse> {
  return apiGet<PaperKeywordListResponse>(`/api/v1/papers/${paperId}/keywords`);
}

export function tagPaperKeyword(
  paperId: string,
  data: PaperKeywordTagCreate,
): Promise<PaperKeywordResponse> {
  return apiPost<PaperKeywordResponse>(`/api/v1/papers/${paperId}/keywords`, data);
}

export function untagPaperKeyword(
  paperId: string,
  keywordId: string,
): Promise<void> {
  return apiDelete<void>(`/api/v1/papers/${paperId}/keywords/${keywordId}`);
}
