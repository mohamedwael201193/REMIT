import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel serves Next tracing itself; standalone is for bun/node hosts only.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  reactStrictMode: false,
};

export default nextConfig;
