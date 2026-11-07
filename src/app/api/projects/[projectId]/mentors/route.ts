import { z } from "zod";
import { idSchema } from "@/contracts";
import { requireSession } from "@/server/auth";
import { endpoint, readJson } from "@/server/http/errors";
import { supervisionService } from "@/features/supervision/server/service";
type Context = {params: Promise<{projectId:string}>};
export const GET = (_request: Request, context: Context) => endpoint(async () => {
  const s=await requireSession(), {projectId}=await context.params;
  return supervisionService().listMentors(s,idSchema.parse(projectId));
});
export const POST = (request: Request, context: Context) => endpoint(async () => {
  const s=await requireSession(), {projectId}=await context.params;
  const input=await readJson(request,z.object({userId:idSchema}));
  return supervisionService().grantMentor(s,idSchema.parse(projectId),input.userId);
});
export const DELETE = (request: Request, context: Context) => endpoint(async () => {
  const s=await requireSession(), {projectId}=await context.params;
  const input=await readJson(request,z.object({userId:idSchema}));
  return supervisionService().revokeMentor(s,idSchema.parse(projectId),input.userId);
});
