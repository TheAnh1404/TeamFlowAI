import "server-only";

// Lazy access: importing this module never reads or validates credentials.
export function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("DATABASE_URL chưa được cấu hình. Cần pooled Neon PostgreSQL URL ở server.");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL không phải URL PostgreSQL hợp lệ.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname.endsWith(".neon.tech")) {
    throw new Error("DATABASE_URL phải là connection string Neon PostgreSQL.");
  }
  return value;
}
