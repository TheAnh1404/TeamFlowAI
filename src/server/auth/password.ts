import "server-only";
import { hash, verify, type Algorithm } from "@node-rs/argon2";

const ARGON2_CONFIG = {
  algorithm: 2 as unknown as Algorithm, // Argon2id (default)
  memoryCost: 19456, // 19 MiB per OWASP recommendation
  timeCost: 2,
  parallelism: 1,
};

// Precomputed valid Argon2id hash matching the above parameters to eliminate timing differences
// Generated with: hash("dummy-timing-password-2026", ARGON2_CONFIG)
const PRECOMPUTED_DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$4Vw49eL3eF7y71VnS5m38w$UePqX2nUom7k4H+Bf0M1W6c4O9sL7vP2uA+mD0R5wYs";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_CONFIG);
}

export async function verifyPassword(hashString: string, password: string): Promise<boolean> {
  try {
    return await verify(hashString, password);
  } catch {
    return false;
  }
}

export async function dummyVerify(): Promise<void> {
  try {
    await verify(PRECOMPUTED_DUMMY_HASH, "invalid-dummy-attempt-password");
  } catch {
    // Intentionally ignored; serves only to take equivalent hashing time
  }
}
