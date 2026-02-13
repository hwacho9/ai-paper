// 共有型定義 - ユーザー

/** ユーザー */
export interface User {
  uid: string;
  email: string;
  displayName: string;
  researchFields: string[];
  createdAt: string;
  preferences: {
    language?: string;
    theme?: string;
  };
}
