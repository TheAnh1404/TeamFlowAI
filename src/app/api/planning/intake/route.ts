import { requireSession } from "@/server/auth";
import { endpoint, readJson } from "@/server/http/errors";
import { intakeInputSchema, reviewLeaderInput } from "@/features/planning/intake";
export const POST=(request:Request)=>endpoint(async()=>{
  await requireSession();return reviewLeaderInput(await readJson(request,intakeInputSchema));
});
