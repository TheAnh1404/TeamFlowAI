import "server-only";
import type { AiProvider } from "./contracts";
import { HttpError } from "@/server/http/errors";
export function boundedAi(provider:AiProvider,timeoutMs=30000):AiProvider {
  return {async generate(kind,input){
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {return await Promise.race([provider.generate(kind,input),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new HttpError(504,"AI_TIMEOUT","Trợ lý đang phản hồi chậm. Dữ liệu đã lưu được giữ nguyên; hãy thử lại.")),timeoutMs);})]);}
    finally{clearTimeout(timer);}
  }};
}
