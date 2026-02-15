"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "ダッシュボード",
  "/search": "論文検索",
  "/library": "マイライブラリ",
  "/projects": "プロジェクト",
  "/memos": "メモ",
  "/graph": "グラフビュー",
};

export function AppHeader() {
  const pathname = usePathname();

  // パス名からページタイトルを取得
  const title =
    pageTitles[pathname] ||
    (pathname.startsWith("/papers/") ? "論文詳細" : "") ||
    (pathname.startsWith("/projects/") ? "プロジェクト詳細" : "") ||
    "";

  return (
    <header className="flex h-16 items-center border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
