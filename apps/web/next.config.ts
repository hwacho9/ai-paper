import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker本番ビルド用: standalone出力モード
  output: "standalone",
};

export default nextConfig;
