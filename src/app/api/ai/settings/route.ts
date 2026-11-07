import {requireSession} from "@/server/auth";
import {endpoint,readJson,assertSameOrigin} from "@/server/http/errors";
import {saveAiSettingsSchema} from "@/features/ai-settings/contracts";
import {aiSettingsService} from "@/features/ai-settings/server/service";
export const GET=()=>endpoint(async()=>aiSettingsService().get(await requireSession()));
export const PUT=(request:Request)=>endpoint(async()=>{
  const session=await requireSession();return aiSettingsService().save(session,await readJson(request,saveAiSettingsSchema));
});
export const DELETE=(request:Request)=>endpoint(async()=>{
  const session=await requireSession();assertSameOrigin(request);return aiSettingsService().remove(session);
});
