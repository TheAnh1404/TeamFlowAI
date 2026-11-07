import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Optional for managed environments that deny child-process workers.
  // TypeScript and prerender checks still run; no error suppression.
  ...(process.env.NEXT_BUILD_WORKER_THREADS === "1"
    ? { experimental: { workerThreads: true, cpus: 2, useTypeScriptCli: false } }
    : {}),
};

export default nextConfig;
