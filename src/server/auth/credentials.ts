import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken(): string { return randomBytes(32).toString("hex"); }

export function matchesAccessCode(provided: string, expected: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(provided).digest(),
    createHash("sha256").update(expected).digest(),
  );
}
