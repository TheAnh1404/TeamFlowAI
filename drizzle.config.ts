import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// CLI-only configuration. Importing pages does not load this file.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    get url(): string {
      const url = process.env.DATABASE_DIRECT_URL?.trim();
      if (!url) {
        throw new Error("DATABASE_DIRECT_URL chưa được cấu hình cho công cụ migration.");
      }
      return url;
    },
  },
});
