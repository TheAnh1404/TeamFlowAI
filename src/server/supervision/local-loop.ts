import "server-only";
import {getDb} from "@/server/db/client";
import {scanDeadlineRisks} from "@/features/supervision/server/service";
const state=globalThis as typeof globalThis & {teamflowDeadlineTimer?:ReturnType<typeof setInterval>;teamflowDeadlineRunning?:boolean};
export function startLocalDeadlineLoop(){
  if(state.teamflowDeadlineTimer)return;
  const interval=Number(process.env.DEADLINE_SCAN_INTERVAL_MS??5000);
  if(!Number.isInteger(interval)||interval<1000||interval>3600000)throw Error("Invalid deadline scan interval");
  const scan=async()=>{
    if(state.teamflowDeadlineRunning)return;state.teamflowDeadlineRunning=true;
    try{await scanDeadlineRisks(getDb());}catch{console.warn("Local deadline scan unavailable; verify demo setup and migrations.");}finally{state.teamflowDeadlineRunning=false;}
  };
  state.teamflowDeadlineTimer=setInterval(()=>{void scan();},interval);state.teamflowDeadlineTimer.unref();void scan();
}
