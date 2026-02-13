// 共有型定義 - プロジェクト

/** プロジェクト */
export interface Project {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  paperCount: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt?: string;
}

/** プロジェクト-論文紐付け */
export interface ProjectPaper {
  projectId: string;
  paperId: string;
  addedAt: string;
  note?: string;
  role: "reference" | "related";
}
