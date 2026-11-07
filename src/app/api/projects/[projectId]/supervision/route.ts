import { idSchema } from "@/contracts";
import { requireSession } from "@/server/auth";
import { endpoint } from "@/server/http/errors";
import { supervisionService } from "@/features/supervision/server/service";
export const GET=(_request:Request,context:{params:Promise<{projectId:string}>})=>endpoint(async()=>{
  const s=await requireSession(), {projectId}=await context.params;
  return supervisionService().overview(s,idSchema.parse(projectId));
});
