import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", "out/**", "dist/**", ".cache/**", "next-env.d.ts"]),
  {
    files: ["src/contracts/**/*.ts", "src/lib/**/*.ts", "src/components/**/*.tsx", "src/features/*/index.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/server/**", "@/features/*/server/**"],
          message: "Client-safe entries must not import server modules. Use contracts or public UI exports.",
        }],
      }],
    },
  },
]);
