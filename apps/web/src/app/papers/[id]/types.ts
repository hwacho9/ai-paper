export type Tab = "overview" | "pdf" | "memos" | "related";

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  abstract: string;
  doi: string | null;
  arxiv_id: string | null;
  pdf_url: string | null;
  status: string;
  is_liked: boolean;
  keywords?: string[];
  prerequisite_keywords?: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectSummary {
  id: string;
  title: string;
}
