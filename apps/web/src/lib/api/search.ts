/**
 * 検索関連API
 */
import { apiGet } from "./client";

export interface SearchQuery {
  q: string;
  year_from?: number;
  year_to?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResultItem {
  external_id: string;
  source: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  abstract: string;
  doi: string | null;
  arxiv_id: string | null;
  pdf_url: string | null;
  citation_count: number | null;
  is_in_library: boolean;
}

export interface SearchResultListResponse {
  results: SearchResultItem[];
  total: number;
  offset: number;
  limit: number;
}

export function searchPapers(
  query: SearchQuery,
): Promise<SearchResultListResponse> {
  const params = new URLSearchParams();
  params.append("q", query.q);
  if (query.year_from) params.append("year_from", String(query.year_from));
  if (query.year_to) params.append("year_to", String(query.year_to));
  if (query.limit) params.append("limit", String(query.limit));
  if (query.offset) params.append("offset", String(query.offset));

  return apiGet<SearchResultListResponse>(
    `/api/v1/search/papers?${params.toString()}`,
  );
}
