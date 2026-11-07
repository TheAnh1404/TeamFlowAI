import {requireSession} from "@/server/auth";
import {endpoint,readJson,assert} from "@/server/http/errors";
import {checkAiSettingsSchema} from "@/features/ai-settings/contracts";
import {aiSettingsService} from "@/features/ai-settings/server/service";
const shared=globalThis as typeof globalThis&{teamflowAiChecks?:Map<string,{until:number;count:number}>};
export const POST=(request:Request)=>endpoint(async()=>{
  const session=await requireSession(),input=await readJson(request,checkAiSettingsSchema),now=Date.now();
  const limits=shared.teamflowAiChecks??=new Map();
  for(const [id,state]of limits)if(state.until<now)limits.delete(id);
  const current=limits.get(session.user.id)??{until:now+60000,count:0};
  assert(current.count<8,429,"CHECK_RATE_LIMIT","Bạn đã kiểm tra nhiều lần. Chờ khoảng một phút rồi thử lại.");
  limits.set(session.user.id,{...current,count:current.count+1});
  return aiSettingsService().check(session,input);
});
