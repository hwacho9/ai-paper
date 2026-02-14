import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AuthProvider } from "@/components/auth/auth-context";
import { AgentChatWidget } from "@/components/agent/agent-chat-widget";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Paper Manager — 論文管理サービス",
  description:
    "論文検索・保存・メモ・関連研究グラフで研究を加速するプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <div className="flex h-screen overflow-hidden">
            <AppSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <AppHeader />
              <main className="flex-1 overflow-y-auto p-6">
                <div className="animate-in mx-auto w-full max-w-none">{children}</div>
              </main>
            </div>
          </div>
          <AgentChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
