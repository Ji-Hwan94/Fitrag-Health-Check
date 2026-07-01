import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.VERCEL ? "../.next" : ".next",
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
