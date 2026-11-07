import { loadEnvConfig } from "@next/env";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { closeDb, getDb } from "../src/server/db/client";
import { seedDemoUsers } from "../src/server/db/seed";
loadEnvConfig(process.cwd());
// This command always targets the isolated local rehearsal DB, never Neon.
process.env.TEAMFLOW_DATABASE_MODE="local-demo";
async function main(){
  const db=getDb();
  try {await migrate(db as unknown as PgliteDatabase,{migrationsFolder:"drizzle"});await seedDemoUsers(db);console.log("Local demo database ready. Existing project data was preserved; demo identities were seeded safely.");}
  finally{await closeDb(db);}
}
main().catch(()=>{console.error("Local demo setup failed. Check the .cache directory and migration files.");process.exitCode=1;});
