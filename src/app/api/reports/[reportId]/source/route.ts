import { and, eq } from "drizzle-orm";
import { sourceRefSchema, idSchema } from "@/contracts";
import { requireSession } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { tasks, submissions, reviews, messages, progressUpdates } from "@/server/db/schema";
import { endpoint, notFound } from "@/server/http/errors";
import { deliveryService } from "@/features/delivery/server/service";
export const GET=(request:Request,context:{params:Promise<{reportId:string}>})=>endpoint(async()=>{
  const session=await requireSession();
  const report=await deliveryService.getReport(session,idSchema.parse((await context.params).reportId));
  const url=new URL(request.url),ref=sourceRefSchema.parse({entity:url.searchParams.get("entity"),id:url.searchParams.get("id")});
  if(!report.sourceRefs.some(r=>r.entity===ref.entity&&r.id===ref.id))throw notFound();
  const db=getDb();let record:unknown;
  switch(ref.entity){
    case "Task": record=(await db.select().from(tasks).where(and(eq(tasks.id,ref.id),eq(tasks.projectId,report.projectId))))[0];break;
    case "Submission":record=(await db.select().from(submissions).where(and(eq(submissions.id,ref.id),eq(submissions.projectId,report.projectId))))[0];break;
    case "Review":record=(await db.select().from(reviews).where(and(eq(reviews.id,ref.id),eq(reviews.projectId,report.projectId))))[0];break;
    case "Message":record=(await db.select().from(messages).where(and(eq(messages.id,ref.id),eq(messages.projectId,report.projectId))))[0];break;
    case "ProgressUpdate":record=(await db.select().from(progressUpdates).where(and(eq(progressUpdates.id,ref.id),eq(progressUpdates.projectId,report.projectId))))[0];break;
  }
  if(!record)throw notFound();
  return {sourceRef:ref,reportAsOf:report.asOf,currentState:ref.entity==="Task",record};
});
