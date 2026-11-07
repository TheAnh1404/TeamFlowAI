// One authenticated invocation. Scheduling belongs to the external managed scheduler.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
const origin=process.env.APP_ORIGIN,secret=process.env.COORDINATOR_SERVICE_SECRET;
if(!origin||!secret||secret.length<32)throw new Error("Cần APP_ORIGIN và COORDINATOR_SERVICE_SECRET (ít nhất 32 ký tự).");
const url=new URL("/api/internal/coordinator/tick",origin);
if(process.argv.includes("--dry-run"))url.searchParams.set("dryRun","1");
const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(55000)});
const body=await response.json();
if(!response.ok){process.stderr.write(`Tick HTTP ${response.status}: ${body.error?.code??"REQUEST_FAILED"}\n`);process.exitCode=1;}
else process.stdout.write(JSON.stringify(body.data)+"\n");
