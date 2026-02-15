"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // パス名からページタイトルを取得
  const title =
    pageTitles[pathname] ||
    (pathname.startsWith("/papers/") ? "論文詳細" : "") ||
    (pathname.startsWith("/projects/") ? "プロジェクト詳細" : "") ||
    "";

  return (
    <header className="flex h-16 items-center border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <h1 className="text-lg font-semibold">{title}</h1>
      {mounted && (
        <Tabs
          className="ml-auto"
          orientation="horizontal"
          value={theme === "light" ? "light" : "dark"}
          onValueChange={(value) => setTheme(value)}
        >
          <TabsList>
            <TabsTrigger value="light">Light</TabsTrigger>
            <TabsTrigger value="dark">Dark</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </header>
  );
}
