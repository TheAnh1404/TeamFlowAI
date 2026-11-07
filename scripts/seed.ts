import { loadEnvConfig } from "@next/env";
import { getDb, closeDb } from "../src/server/db/client";
import { seedDemoUsers } from "../src/server/db/seed";

async function main() {
  loadEnvConfig(process.cwd());
  const db = getDb();
  try { await seedDemoUsers(db); console.log("Đã chuẩn bị TV1/TV2/TV3/MENTOR. Không thay đổi project/task hiện có."); }
  finally { await closeDb(db); }
}
main().catch(() => { console.error("Seed thất bại. Kiểm tra cấu hình Neon và migration trước."); process.exitCode = 1; });
