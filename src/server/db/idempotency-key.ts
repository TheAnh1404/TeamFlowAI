import { createHash } from "node:crypto";

export function mutationIdentity(userId: string, operation: string, key: string, input: unknown) {
  return {
    scope: createHash("sha256").update(JSON.stringify([userId, operation, key])).digest("hex"),
    fingerprint: createHash("sha256").update(JSON.stringify(input)).digest("hex"),
  };
}
