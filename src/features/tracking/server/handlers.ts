import "server-only";
import { and, eq, ilike, notInArray, or } from "drizzle-orm";
import { createDemoSessionInputSchema, resolveTaskReferenceInputSchema, submitProgressMessageInputSchema } from "@/contracts";
import { requireSession } from "@/server/auth";
import { projectMember } from "@/server/auth/access";
import { getDb } from "@/server/db/client";
import { projectMembers, users } from "@/server/db/schema";
import { assert } from "@/server/http/errors";
import { createDemoSession, endDemoSession } from "@/server/auth/demo-session";
import { apiHandler, assertSameOrigin, readJson } from "@/server/http/api-error";
import { requireMutationKey } from "@/server/db/idempotency";
import { listDemoUsers, listProjectMembers, listProjectSummaries } from "@/server/data/project-queries";
import { trackingService } from "./implementation";

type ProjectContext = { params: Promise<{ projectId: string }> };
type TaskContext = { params: Promise<{ taskId: string }> };
type MessageContext = { params: Promise<{ messageId: string }> };
const messageInput = submitProgressMessageInputSchema;
const resolveInput = resolveTaskReferenceInputSchema;

export const getSession = () => apiHandler(requireSession);
export const postSession = (request: Request) => apiHandler(async () => {
  assertSameOrigin(request);
  return createDemoSession(await readJson(request, createDemoSessionInputSchema));
});
export const deleteSession = (request: Request) => apiHandler(async () => {
  assertSameOrigin(request);
  return endDemoSession();
});
export const getUsers = () => apiHandler(async () => { await requireSession(); return listDemoUsers(); });
export const getProjects = () => apiHandler(async () => listProjectSummaries(await requireSession()));
export const getMembers = (request: Request, context: ProjectContext) => apiHandler(async () => {
  const session = await requireSession();
  const projectId = (await context.params).projectId;
  const query = new URL(request.url).searchParams.get("search")?.trim();
  if (!query) return listProjectMembers(session, projectId);
  assert(query.length >= 2 && query.length <= 100, 422, "VALIDATION_ERROR", "Nháº­p Ã­t nháº¥t 2 kÃ½ tá»± Ä‘á»ƒ tÃ¬m tÃ i khoáº£n.");
  const actor = await projectMember(getDb(), session, projectId);
  assert(actor.role === "leader", 403, "FORBIDDEN", "Chá»‰ trÆ°á»Ÿng nhÃ³m Ä‘Æ°á»£c tÃ¬m tÃ i khoáº£n Ä‘á»ƒ thÃªm vÃ o dá»± Ã¡n.");
  const existing = await getDb().select({ userId: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, projectId));
  const excludedIds = existing.map(({ userId }) => userId);
  return getDb().select({ userId: users.id, displayName: users.displayName, email: users.email })
    .from(users)
    .where(and(or(ilike(users.displayName, `%${query}%`), ilike(users.email, `%${query}%`)), excludedIds.length ? notInArray(users.id, excludedIds) : undefined))
    .limit(8);
});
export const getTasks = (request: Request, context: ProjectContext) => apiHandler(async () => trackingService.listTasks(await requireSession(), (await context.params).projectId));
export const getTask = (request: Request, context: TaskContext) => apiHandler(async () => trackingService.getTask(await requireSession(), (await context.params).taskId));
export const getProgress = (request: Request, context: TaskContext) => apiHandler(async () => trackingService.listProgressUpdates(await requireSession(), (await context.params).taskId));
export const getMessages = (request: Request, context: ProjectContext) => apiHandler(async () => trackingService.listMessages(await requireSession(), (await context.params).projectId));
export const postMessage = (request: Request, context: ProjectContext) => apiHandler(async () => {
  assertSameOrigin(request);
  const session = await requireSession();
  const key = requireMutationKey(request.headers.get("Idempotency-Key"));
  const input = await readJson(request, messageInput);
  return trackingService.submitProgressMessage(session, (await context.params).projectId, input, { idempotencyKey: key });
});
export const resolveMessage = (request: Request, context: MessageContext) => apiHandler(async () => {
  assertSameOrigin(request);
  const session = await requireSession();
  const key = requireMutationKey(request.headers.get("Idempotency-Key"));
  const input = await readJson(request, resolveInput);
  return trackingService.resolveTaskReference(session, (await context.params).messageId, input, { idempotencyKey: key });
});
