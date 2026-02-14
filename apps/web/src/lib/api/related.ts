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
};
