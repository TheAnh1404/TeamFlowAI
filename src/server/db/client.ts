import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getDatabaseUrl } from "@/server/env";
import * as schema from "./schema";

function createDb() {
  // Node 24 supplies WebSocket. The pool opens connections only on first query.
  // WebSockets support the interactive transactions required by tracking.
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = new Pool({ connectionString: getDatabaseUrl(), max: 5, connectionTimeoutMillis: 8000 });
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DataConnection = Database | Transaction;
export type DatabaseTransaction = Transaction;
export type DatabaseReader = DataConnection;

let database: Database | undefined;

// Server repositories only; no connection or environment access at import/build time.
export function getDb(): Database {
  database ??= createDb();
  return database;
}
