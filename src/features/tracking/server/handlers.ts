import "server-only";
import { z } from "zod";
import { createDemoSessionInputSchema, resolveTaskReferenceInputSchema, submitProgressMessageInputSchema } from "@/contracts";
import { requireSession } from "@/server/auth";
import { createDemoSession, endDemoSession } from "@/server/auth/demo-session";
import { apiHandler, assertSameOrigin, readJson } from "@/server/http/api-error";
import { requireMutationKey } from "@/server/db/idempotency";
import { listDemoUsers, listProjectMembers, listProjectSummaries } from "@/server/data/project-queries";
import { trackingService } from "./implementation";

type ProjectContext = { params: Promise<{ projectId: string }> };
type TaskContext = { params: Promise<{ taskId: string }> };
type MessageContext = { params: Promise<{ messageId: string }> };
const messageInput = submitProgressMessageInputSchema.extend({
  content: z.string().trim().min(1).max(5000),
  taskId: z.string().min(1).max(200).optional(),
}).strict();
const resolveInput = resolveTaskReferenceInputSchema.extend({
  taskId: z.string().min(1).max(200),
  blocker: z.string().trim().max(5000).optional(),
  expectedTaskVersion: z.number().int().positive(),
}).strict();

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
export const getMembers = (request: Request, context: ProjectContext) => apiHandler(async () => listProjectMembers(await requireSession(), (await context.params).projectId));
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
