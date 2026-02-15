/**
 * キーワード関連API
 */
import { apiDelete, apiGet, apiPost } from "./client";

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
    reason?: "llm_paper_keyword" | "llm_prerequisite_keyword" | string;
}

export interface PaperKeywordResponse {
    paper_id: string;
    keyword_id: string;
    label: string;
    description: string;
    confidence: number;
    source: string;
    reason: string;
}

export interface PaperKeywordListResponse {
    keywords: PaperKeywordResponse[];
    total: number;
}

export interface KeywordSuggestionResponse {
    keywords: KeywordResponse[];
}

export function createKeyword(data: KeywordCreate): Promise<KeywordResponse> {
    return apiPost<KeywordResponse>("/api/v1/keywords", data);
}

export function listKeywords(): Promise<KeywordListResponse> {
    return apiGet<KeywordListResponse>("/api/v1/keywords");
}

export function getPaperKeywords(
    paperId: string,
): Promise<PaperKeywordListResponse> {
    return apiGet<PaperKeywordListResponse>(
        `/api/v1/papers/${encodePaperId(paperId)}/keywords`,
    );
}

export function tagPaperKeywords(
    paperId: string,
    data: PaperKeywordTagCreate,
): Promise<void> {
    return apiPost<void>(
        `/api/v1/papers/${encodePaperId(paperId)}/keywords`,
        data,
    );
}

export function untagPaperKeyword(
    paperId: string,
    keywordId: string,
): Promise<void> {
    return apiDelete<void>(
        `/api/v1/papers/${encodePaperId(paperId)}/keywords/${keywordId}`,
    );
}

export function suggestKeywords(
    paperId: string,
): Promise<KeywordSuggestionResponse> {
    return apiPost<KeywordSuggestionResponse>(
        `/api/v1/papers/${encodePaperId(paperId)}/keywords/suggest`,
    );
}
