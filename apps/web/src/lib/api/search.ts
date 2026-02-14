/**
 * 検索関連API
 */
import { apiGet, apiPost } from "./client";

export interface SearchQuery {
  q: string;
  year_from?: number;
  year_to?: number;
  source?: "auto" | "all" | "arxiv" | "pubmed" | "scholar" | "gemini";
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

export interface ReclusterSearchRequest {
  query: string;
  source?: "auto" | "all" | "arxiv" | "pubmed" | "scholar" | "gemini";
  top_k?: number;
  group_target?: number;
  include_related?: boolean;
}

export interface ClusterPaperItem {
  paper_id: string;
  title: string;
  year: number | null;
  source: string;
  score: number;
  relation_type: string | null;
}

export interface SearchCluster {
  cluster_id: string;
  label: string;
  summary: string;
  hub_paper: ClusterPaperItem;
  children: ClusterPaperItem[];
  related: ClusterPaperItem[];
}

export interface ReclusterSearchResponse {
  query: string;
  clusters: SearchCluster[];
  uncertain_items: ClusterPaperItem[];
  meta: {
    fetched?: number;
    latency_ms?: number;
    model?: string;
    fallback_used?: boolean;
    [key: string]: unknown;
  };
}

export function searchPapers(
  query: SearchQuery,
): Promise<SearchResultListResponse> {
  const params = new URLSearchParams();
  params.append("q", query.q);
  if (query.year_from) params.append("year_from", String(query.year_from));
  if (query.year_to) params.append("year_to", String(query.year_to));
  if (query.source) params.append("source", query.source);
  if (query.limit) params.append("limit", String(query.limit));
  if (query.offset) params.append("offset", String(query.offset));

  return apiGet<SearchResultListResponse>(
    `/api/v1/search/papers?${params.toString()}`,
  );
}

export function searchPapersReclustered(
  payload: ReclusterSearchRequest,
): Promise<ReclusterSearchResponse> {
  return apiPost<ReclusterSearchResponse>(
    "/api/v1/search/papers/recluster",
    payload,
  );
}
