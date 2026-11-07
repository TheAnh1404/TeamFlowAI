import { loadEnvConfig } from "@next/env";
import { setTimeout as delay } from "node:timers/promises";
import { getDb, closeDb, isLocalDemo } from "../src/server/db/client";
import { scanDeadlineRisks } from "../src/features/supervision/server/service";

loadEnvConfig(process.cwd());
const controller=new AbortController();
process.once("SIGINT",()=>controller.abort());
process.once("SIGTERM",()=>controller.abort());
async function main() {
  const once=process.argv.includes("--once");
  if(isLocalDemo())throw Error("Local rehearsal runs the deadline loop inside the web process; do not open its database from another process.");
  const interval=Number(process.env.DEADLINE_SCAN_INTERVAL_MS??60000);
  if(!Number.isInteger(interval)||interval<1000||interval>3600000)throw Error("Invalid interval");
  const db=getDb();
  try {
    while(!controller.signal.aborted) {
      try { console.log(JSON.stringify({event:"deadline_scan",...await scanDeadlineRisks(db)})); }
      catch { console.error("Deadline scan failed. Verify database configuration; no external message was sent.");if(once)process.exitCode=1; }
      if(once)break;
      try { await delay(interval,undefined,{signal:controller.signal}); } catch { break; }
    }
  } finally { await closeDb(db); }
}
main().catch(()=>{console.error("Deadline worker could not start. Verify database and interval settings.");process.exitCode=1;});
