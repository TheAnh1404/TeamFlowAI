import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// CLI-only configuration. Importing pages does not load this file.
loadEnvConfig(process.cwd());
const directUrl = process.env.DATABASE_DIRECT_URL?.trim();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  // Generation needs no credentials. Migration requires a direct Neon URL.
  ...(directUrl ? { dbCredentials: { url: directUrl } } : {}),
});
