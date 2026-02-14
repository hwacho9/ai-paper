/**
 * メモ関連API
 */
import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export interface MemoRef {
  ref_type: string;
  ref_id: string;
  note: string | null;
}

export interface MemoResponse {
  id: string;
  owner_uid: string;
  title: string;
  body: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  tags: string[];
  refs: MemoRef[];
}

export interface MemoListResponse {
  memos: MemoResponse[];
  total: number;
}

export function getMemos(): Promise<MemoListResponse> {
  return apiGet<MemoListResponse>("/api/v1/memos");
}

export function getMemo(id: string): Promise<MemoResponse> {
  return apiGet<MemoResponse>(`/api/v1/memos/${id}`);
}

export function createMemo(data: {
  title: string;
  body: string;
  tags?: string[];
  refs?: MemoRef[];
}): Promise<MemoResponse> {
  return apiPost<MemoResponse>("/api/v1/memos", data);
}

export function updateMemo(
  id: string,
  data: {
    title?: string;
    body?: string;
    tags?: string[];
    status?: string;
    refs?: MemoRef[];
  },
): Promise<MemoResponse> {
  return apiPatch<MemoResponse>(`/api/v1/memos/${id}`, data);
}

export function deleteMemo(id: string): Promise<void> {
  return apiDelete<void>(`/api/v1/memos/${id}`);
}
