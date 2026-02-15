/**
 * 読解サポート関連API
 */
import { apiGet, apiPost } from "./client";

const normalizePaperId = (rawId: string): string => {
    let next = rawId;
    for (let i = 0; i < 3; i += 1) {
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

export interface LibraryAskRequest {
    question: string;
    paper_ids?: string[];
    top_k?: number;
}

export interface LibraryAskCitation {
    paper_id: string;
    chunk_id: string;
    score: number;
    page_range: number[];
    snippet: string;
}

export interface LibraryAskResponse {
    answer: string;
    confidence: number;
    citations: LibraryAskCitation[];
}

export interface PaperOutlineItem {
    start_page: number;
    end_page: number;
    chunk_count: number;
    first_chunk_id: string | null;
    last_chunk_id: string | null;
}

export interface PaperChunk {
    chunk_id: string;
    paper_id: string;
    text: string;
    page_range: number[];
    start_char_idx: number | null;
    end_char_idx: number | null;
}

export interface HighlightCreate {
    chunk_id?: string | null;
    text_span: string;
    start_offset: number;
    end_offset: number;
    page_number: number;
    note?: string;
    color?: string;
}

export interface HighlightItem {
    id: string;
    owner_uid: string;
    paper_id: string;
    chunk_id: string | null;
    text_span: string;
    start_offset: number;
    end_offset: number;
    page_number: number;
    note: string;
    color: string;
    created_at: string | null;
}

export function askLibrary(
    data: LibraryAskRequest,
): Promise<LibraryAskResponse> {
    return apiPost<LibraryAskResponse>("/api/v1/library/ask", data);
}

export function getPaperChunks(
    paperId: string,
): Promise<{ chunks: PaperChunk[] } | PaperChunk[]> {
    return apiGet<PaperChunk[]>(
        `/api/v1/papers/${encodePaperId(paperId)}/chunks`,
    );
}

export function getPaperOutline(paperId: string): Promise<PaperOutlineItem[]> {
    return apiGet<PaperOutlineItem[]>(
        `/api/v1/papers/${encodePaperId(paperId)}/outline`,
    );
}

export function createHighlight(
    paperId: string,
    data: HighlightCreate,
): Promise<HighlightItem> {
    return apiPost<HighlightItem>(
        `/api/v1/papers/${encodePaperId(paperId)}/highlights`,
        data,
    );
}

export function listHighlights(paperId: string): Promise<HighlightItem[]> {
    return apiGet<HighlightItem[]>(
        `/api/v1/papers/${encodePaperId(paperId)}/highlights`,
    );
}
