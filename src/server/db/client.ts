import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "@/server/env";
import * as schema from "./schema";

function createDb() {
  // Client construction only. No query or network request is issued here.
  return drizzle(neon(getDatabaseUrl()), { schema });
}

export type Database = ReturnType<typeof createDb>;
let database: Database | undefined;

// TODO(TV2): use only from server repositories; pages/stubs must not call it.
export function getDb(): Database {
  database ??= createDb();
  return database;
}
