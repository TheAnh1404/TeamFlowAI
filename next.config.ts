import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  ...(process.env.NEXT_BUILD_WORKER_THREADS === "1"
    ? { experimental: { workerThreads: true, cpus: 2, useTypeScriptCli: false } }
    : {}),
};

export default nextConfig;
