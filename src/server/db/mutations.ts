import "server-only";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Database, Transaction } from "./client";
import { mutationResults } from "./schema";
import { assert } from "@/server/http/errors";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k) + ":" + canonical(v)).join(",") + "}";
  return JSON.stringify(value);
}
export function mutationIdentity(userId: string, path: string, key: string, body: unknown) {
  assert(/^[A-Za-z0-9_-]{8,128}$/.test(key), 422, "VALIDATION_ERROR", "Idempotency-Key cần 8–128 ký tự chữ, số, dấu gạch ngang hoặc gạch dưới.");
  return { scope: JSON.stringify([userId, path, key]), userId, fingerprint: createHash("sha256").update(canonical(body)).digest("hex") };
}
export type MutationIdentity = ReturnType<typeof mutationIdentity>;
export async function replay<T>(db: Database | Transaction, identity: MutationIdentity): Promise<T | undefined> {
  const [saved] = await db.select().from(mutationResults).where(eq(mutationResults.scope, identity.scope));
  if (!saved) return undefined;
  assert(saved.fingerprint === identity.fingerprint, 409, "IDEMPOTENCY_CONFLICT", "Key này đã dùng với nội dung khác.");
  return saved.result as T;
}
// Revalidate access BEFORE replay; writes and saved result commit together.
export async function commitMutation<T>(db: Database, identity: MutationIdentity, action: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${identity.scope}))`);
    const saved = await replay<T>(tx, identity); if (saved !== undefined) return saved;
    const result = await action(tx);
    await tx.insert(mutationResults).values({ ...identity, result, createdAt: new Date().toISOString() });
    return result;
  });
}
