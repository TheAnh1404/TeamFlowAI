import env from "@next/env";
import { neon } from "@neondatabase/serverless";
import { demoAccounts } from "../src/server/auth/demo-accounts.ts";

env.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("Cần DATABASE_DIRECT_URL hoặc DATABASE_URL để seed tài khoản.");
try {
  const sql = neon(url, { fetchOptions: { signal: AbortSignal.timeout(15000) } });
  await sql.transaction(demoAccounts.map(account =>
    sql.query("insert into users (id, display_name, demo_account) values ($1, $2, $3) on conflict (id) do nothing", [account.id, account.displayName, account.demoAccount])
  ));
  console.log("Đã seed ba tài khoản demo. Không tạo dự án/task, không reset dữ liệu.");
} catch {
  console.error("Seed không thành công. Kiểm tra kết nối và migration; không có reset được thực hiện.");
  process.exitCode = 1;
}
