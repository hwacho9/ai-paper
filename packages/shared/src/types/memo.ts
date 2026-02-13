// 共有型定義 - メモ

/** メモ */
export interface Memo {
  id: string;
  ownerUid: string;
  title: string;
  body: string;
  status: "draft" | "reviewed";
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

/** メモ参照 */
export interface MemoRef {
  memoId: string;
  refType: "paper" | "project" | "chunk" | "keyword";
  refId: string;
  note?: string;
}
