import "server-only";
import type { Database } from "./client";
import { users } from "./schema";
import { DEMO_ACCOUNTS } from "@/server/auth/session";

// Non-destructive. Seed identities only: no forged published plans/tasks.
export async function seedDemoUsers(db: Database) {
  await db.insert(users).values(Object.entries(DEMO_ACCOUNTS).map(([name, id]) => ({
    id, displayName: name, createdAt: new Date().toISOString(),
  }))).onConflictDoNothing();
}
