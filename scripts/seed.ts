import { loadEnvConfig } from "@next/env";
import { getDb } from "../src/server/db/client";
import { seedDemoUsers } from "../src/server/db/seed";

async function main() {
  loadEnvConfig(process.cwd());
  const db = getDb();
  try { await seedDemoUsers(db); console.log("Đã chuẩn bị TV1/TV2/TV3. Không thay đổi project/task hiện có."); }
  finally { await db.$client.end(); }
}
main().catch(() => { console.error("Seed thất bại. Kiểm tra cấu hình Neon và migration trước."); process.exitCode = 1; });
