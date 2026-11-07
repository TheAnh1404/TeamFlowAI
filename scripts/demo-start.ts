import {loadEnvConfig} from "@next/env";
import {spawn} from "node:child_process";
loadEnvConfig(process.cwd());
if(!process.env.DEMO_ACCESS_CODE||process.env.DEMO_ACCESS_CODE.length<16){
  console.error("Set DEMO_ACCESS_CODE (at least 16 characters) in .env.local before starting rehearsal. The code is never printed.");process.exitCode=1;
}else{
  const env={...process.env,TEAMFLOW_DATABASE_MODE:"local-demo",ENABLE_DEMO_AUTH:"true",AI_FORCE_MOCK:"true",LOCAL_DEMO_DEADLINE_WORKER:"true"};
  const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",process.env.PORT??"3000"],{env,stdio:"inherit",windowsHide:true});
  const stop=()=>child.kill();process.once("SIGINT",stop);process.once("SIGTERM",stop);
  child.once("exit",code=>{process.exitCode=code??1;});
  child.once("error",()=>{console.error("Could not start rehearsal. Run npm run build first.");process.exitCode=1;});
}
