import "server-only";
import { eq, sql } from "drizzle-orm";
import type { ZodType } from "zod";
import { getDb, type DatabaseTransaction } from "./client";
import { mutationRequests } from "./schema";
import { mutationIdentity } from "./idempotency-key";
import { ApiError } from "@/server/http/api-error";

export interface MutationRequest {
  userId: string;
  operation: string;
  key: string;
  input: unknown;
}
export function requireMutationKey(key: string | null): string {
  if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw new ApiError(422, "VALIDATION_ERROR", "Cần Idempotency-Key từ 8–128 ký tự chữ, số, gạch nối hoặc gạch dưới.");
  return key;
}
export async function findMutationResult<T>(request: MutationRequest, schema: ZodType<T>): Promise<T | null> {
  const identity = mutationIdentity(request.userId, request.operation, request.key, request.input);
  const [row] = await getDb().select().from(mutationRequests).where(eq(mutationRequests.scope, identity.scope));
  if (!row) return null;
  if (row.fingerprint !== identity.fingerprint) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "Key này đã được sử dụng cho nội dung khác.");
  return schema.parse(row.result);
}

// The lock, authoritative recheck, writes and success record share one transaction.
export async function runIdempotent<T>(
  request: MutationRequest,
  schema: ZodType<T>,
  authorize: (tx: DatabaseTransaction) => Promise<void>,
  work: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  const identity = mutationIdentity(request.userId, request.operation, request.key, request.input);
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${identity.scope}, 0))`);
    await authorize(tx);
    const [row] = await tx.select().from(mutationRequests).where(eq(mutationRequests.scope, identity.scope));
    if (row) {
      if (row.fingerprint !== identity.fingerprint) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "Key này đã được sử dụng cho nội dung khác.");
      return schema.parse(row.result);
    }
    const result = schema.parse(await work(tx));
    await tx.insert(mutationRequests).values({ ...identity, userId: request.userId, result });
    return result;
  });
}
