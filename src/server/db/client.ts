import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getDatabaseUrl } from "@/server/env";
import * as schema from "./schema";

function createDb() {
  neonConfig.webSocketConstructor = WebSocket;
  return drizzle(new Pool({ connectionString: getDatabaseUrl(), max: 5 }), { schema });
}

export type Database = ReturnType<typeof createDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DataConnection = Database | Transaction;
let database: Database | undefined;

// No credentials/network at import or build time. Supports interactive transactions.
export function getDb(): Database {
  database ??= createDb();
  return database;
}
