export async function register(){
  if(process.env.NEXT_RUNTIME==="nodejs"&&process.env.TEAMFLOW_DATABASE_MODE==="local-demo"&&process.env.LOCAL_DEMO_DEADLINE_WORKER==="true"){
    const {startLocalDeadlineLoop}=await import("./server/supervision/local-loop");startLocalDeadlineLoop();
  }
}
