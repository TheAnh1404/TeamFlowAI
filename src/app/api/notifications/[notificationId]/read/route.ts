import { idSchema } from "@/contracts";
import { requireSession } from "@/server/auth";
import { endpoint, assertSameOrigin } from "@/server/http/errors";
import { supervisionService } from "@/features/supervision/server/service";
export const POST=(request:Request,context:{params:Promise<{notificationId:string}>})=>endpoint(async()=>{
  const s=await requireSession();assertSameOrigin(request);
  return supervisionService().markRead(s,idSchema.parse((await context.params).notificationId));
});
