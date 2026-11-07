import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getDatabaseUrl } from "@/server/env";
import * as schema from "./schema";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as localDrizzle } from "drizzle-orm/pglite";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

function createNeonDb() {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = new Pool({ connectionString: getDatabaseUrl(), max: 5, connectionTimeoutMillis: 8000 });
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createNeonDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DataConnection = Database | Transaction;
export type DatabaseTransaction = Transaction;
export type DatabaseReader = DataConnection;

const shared = globalThis as typeof globalThis & { teamflowDatabase?: Database };

export function isLocalDemo() {
  return process.env.TEAMFLOW_DATABASE_MODE === "local-demo";
}

function createDb(): Database {
  if (!isLocalDemo()) return createNeonDb();
  const name = process.env.DEMO_DATABASE_NAME ?? "stage-demo";
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(name)) throw Error("Demo database name must be a simple workspace cache name");
  const directory = join(process.cwd(), ".cache", name);
  mkdirSync(directory, { recursive: true });
  return localDrizzle(new PGlite(directory), { schema }) as unknown as Database;
}

export async function closeDb(db: Database) {
  const client = db.$client as unknown as { close?: () => Promise<void>; end?: () => Promise<void> };
  if (client.close) await client.close(); else await client.end?.();
  if (shared.teamflowDatabase === db) delete shared.teamflowDatabase;
}

// Server repositories only; no connection or environment access at import/build time.
export function getDb(): Database {
  shared.teamflowDatabase ??= createDb();
  return shared.teamflowDatabase;
}
