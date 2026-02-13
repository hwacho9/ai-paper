/**
 * メモ関連API
 */
import { apiGet } from "./client";

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
