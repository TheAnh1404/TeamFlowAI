import env from "@next/env";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

env.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_DIRECT_URL;
if (!url) throw new Error("Cần DATABASE_DIRECT_URL (Neon direct/unpooled) để chạy migration.");
let pool;
try {
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname.endsWith(".neon.tech") || parsed.hostname.includes("-pooler.")) throw new Error("Invalid direct URL");
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 8000 });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Đã áp dụng migration Neon. Không chạy reset hoặc seed tự động.");
} catch {
  console.error("Migration chưa được xác nhận thành công. Kiểm tra URL direct/kết nối; không reset database.");
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
