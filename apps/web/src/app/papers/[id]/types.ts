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
  created_at: string | null;
  updated_at: string | null;
}
