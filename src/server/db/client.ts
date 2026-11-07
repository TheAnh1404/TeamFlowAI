import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getDatabaseUrl } from "@/server/env";
import * as schema from "./schema";

function createDb() {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = new Pool({ connectionString: getDatabaseUrl(), max: 5, connectionTimeoutMillis: 8000 });
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DataConnection = Database | Transaction;
export type DatabaseTransaction = Transaction;
export type DatabaseReader = DataConnection;

const shared = globalThis as typeof globalThis & { teamflowDatabase?: Database };

export function getDb(): Database {
  shared.teamflowDatabase ??= createDb();
  return shared.teamflowDatabase;
}

export async function closeDb(database: Database) {
  await database.$client.end();
  if (shared.teamflowDatabase === database) delete shared.teamflowDatabase;
}
