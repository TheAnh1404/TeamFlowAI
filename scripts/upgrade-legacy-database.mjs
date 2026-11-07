import env from "@next/env";
import { Pool, neonConfig } from "@neondatabase/serverless";
import fs from "node:fs";
import { upgradeLegacyFoundation } from "./lib/legacy-schema-upgrade.mjs";

env.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_DIRECT_URL;
if (!url) throw new Error("Cần DATABASE_DIRECT_URL riêng trong .env.local.");
neonConfig.webSocketConstructor = globalThis.WebSocket;
const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 8000 });
let client;
try {
  client = await pool.connect();
  const result = await upgradeLegacyFoundation(client, { apply: process.argv.includes("--apply") });
  fs.mkdirSync(".cache/legacy-schema-upgrade", { recursive: true });
  fs.writeFileSync(".cache/legacy-schema-upgrade/plan.sql", "BEGIN;\n" + result.statements.join("\n") + "\nCOMMIT;\n");
  console.log(JSON.stringify({ alreadyCurrent: result.alreadyCurrent, applied: result.applied, statementCount: result.statements.length, preservedCounts: result.preservedCounts, plan: ".cache/legacy-schema-upgrade/plan.sql" }));
} catch (error) {
  // Print only curated helper errors; driver messages can contain connection details.
  console.error(error instanceof Error && !("severity" in error) && !("code" in error) ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]") : "Nâng cấp không thành công; transaction đã rollback. Kiểm tra kết nối/schema phía server.");
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
