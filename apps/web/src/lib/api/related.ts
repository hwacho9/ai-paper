import { apiGet } from "./client";

export interface RelatedPaper {
    paperId: string;
    title: string;
    authors: string[];
    year?: number | null;
    venue?: string | null;
    abstract?: string | null;
    similarity: number;
    citationCount: number;
}

export interface Node {
    id: string;
    label: string;
    group?: string;
    val: number;
}

export interface Edge {
    source: string;
    target: string;
    value: number;
}

export interface GraphData {
    nodes: Node[];
    edges: Edge[];
}

export interface KeywordRelatedItem {
    paper_id: string;
    title: string;
    authors: string[];
    year?: number | null;
    matched_tag?: string | null;
    candidate_tag?: string | null;
    reason?: string | null;
    score: number;
}

export interface KeywordRelatedGroup {
    keyword: string;
    items: KeywordRelatedItem[];
}

export interface LibraryRelatedByKeywordResponse {
    paper_id: string;
    groups: KeywordRelatedGroup[];
    meta: {
        library_size?: number;
        keywords_used?: number;
        deduped_count?: number;
    };
}

export const relatedApi = {
    getRelatedPapers: async (
        paperId: string,
        limit: number = 5,
    ): Promise<RelatedPaper[]> => {
        return apiGet<RelatedPaper[]>(
            `/api/v1/papers/${paperId}/related?limit=${limit}`,
        );
    },

    getProjectGraph: async (projectId: string): Promise<GraphData> => {
        return apiGet<GraphData>(`/api/v1/projects/${projectId}/graph`);
    },

    getGlobalGraph: async (): Promise<GraphData> => {
        return apiGet<GraphData>("/api/v1/graph");
    },

    getLibraryRelatedByKeywords: async (
        paperId: string,
        perKeywordLimit: number = 15,
        maxKeywords: number = 8,
    ): Promise<LibraryRelatedByKeywordResponse> => {
        return apiGet<LibraryRelatedByKeywordResponse>(
            `/api/v1/papers/${paperId}/library-related-by-keywords?per_keyword_limit=${perKeywordLimit}&max_keywords=${maxKeywords}`,
        );
    },
};
