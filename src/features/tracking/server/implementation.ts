import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { messageSchema, progressUpdateSchema, taskSchema, type Message, type MutationOptions, type ProgressMessageResult, type ProgressUpdate, type ResolveTaskReferenceInput, type SubmitProgressMessageInput, type Task } from "@/contracts";
import type { Session } from "@/server/auth/contracts";
import { requireMembership } from "@/server/auth";
import { getDb, type DatabaseReader, type DatabaseTransaction } from "@/server/db/client";
import { messages } from "@/server/db/schema";
import { findMutationResult, runIdempotent, requireMutationKey, type MutationRequest } from "@/server/db/idempotency";
import { ApiError } from "@/server/http/api-error";
import { analyzeProgress } from "./coordinator";
import { canUpdateTask, decideProgress, supportsChatProgress } from "./policy";
import { NeonTrackingRepository } from "./neon-repository";
import type { TrackingService } from "./service";

export const progressMessageResultSchema = z.object({
  message: messageSchema, progressUpdate: progressUpdateSchema.nullable(), task: taskSchema.nullable(),
});

async function taskForSession(db: DatabaseReader, session: Session, taskId: string) {
  const task = await new NeonTrackingRepository(db).getTask(taskId);
  if (!task) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy công việc đã công bố.");
  const member = await requireMembership(db, session, task.projectId);
  return { task, member };
}

function requestFor(session: Session, operation: string, input: unknown, options: MutationOptions): MutationRequest {
  return { userId: session.user.id, operation, key: requireMutationKey(options.idempotencyKey), input };
}
function progressRecord(message: Message, task: Task, status: "in_progress" | "blocked", blocker: string | null): ProgressUpdate {
  return { id: randomUUID(), projectId: task.projectId, taskId: task.id, messageId: message.id, authorMemberId: message.authorMemberId, statusBefore: task.status, statusAfter: status, note: message.content, blocker, createdAt: new Date().toISOString() };
}
async function verifyResolve(db: DatabaseReader, session: Session, messageId: string, taskId: string) {
  const repo = new NeonTrackingRepository(db);
  const message = await repo.getMessage(messageId);
  if (!message) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin nhắn.");
  const member = await requireMembership(db, session, message.projectId);
  const task = await repo.getTask(taskId);
  if (!task || task.projectId !== message.projectId) throw new ApiError(422, "VALIDATION_ERROR", "Công việc không thuộc dự án của tin nhắn.");
  if (message.authorMemberId !== member.id || !canUpdateTask(member, task)) throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền xác nhận cập nhật này.");
  return { message, task, member };
}

export const trackingService: TrackingService = {
  async listTasks(session, projectId) {
    await requireMembership(getDb(), session, projectId);
    return new NeonTrackingRepository(getDb()).listTasks(projectId);
  },
  async getTask(session, taskId) {
    return (await taskForSession(getDb(), session, taskId)).task;
  },
  async listMessages(session, projectId) {
    await requireMembership(getDb(), session, projectId);
    return new NeonTrackingRepository(getDb()).listMessages(projectId);
  },
  async listProgressUpdates(session, taskId) {
    await taskForSession(getDb(), session, taskId);
    return new NeonTrackingRepository(getDb()).listProgressUpdates(taskId);
  },
  async submitProgressMessage(session: Session, projectId: string, input: SubmitProgressMessageInput, options: MutationOptions): Promise<ProgressMessageResult> {
    await requireMembership(getDb(), session, projectId);
    const request = requestFor(session, "POST /api/projects/" + projectId + "/messages", input, options);
    const replay = await findMutationResult(request, progressMessageResultSchema);
    if (replay) return replay;
    const snapshot = await new NeonTrackingRepository(getDb()).listTasks(projectId);
    if (input.taskId && !snapshot.some(task => task.id === input.taskId)) throw new ApiError(422, "VALIDATION_ERROR", "Công việc không thuộc danh sách đã công bố của dự án.");
    const contextTasks = input.taskId ? snapshot.filter(task => task.id === input.taskId) : snapshot;
    if (contextTasks.length > 100) throw new ApiError(422, "VALIDATION_ERROR", "Hãy chọn một công việc trước khi gửi cập nhật.");
    const analysis = await analyzeProgress({ message: { content: input.content, taskId: input.taskId ?? null }, tasks: contextTasks });
    const authorize = async (tx: DatabaseTransaction) => { await requireMembership(tx, session, projectId); };
    return runIdempotent(request, progressMessageResultSchema, authorize, async tx => {
      const member = await requireMembership(tx, session, projectId);
      const repo = new NeonTrackingRepository(tx);
      const current = await repo.listTasks(projectId);
      const decision = decideProgress({ member, tasks: current, selectedTaskId: input.taskId, content: input.content, proposal: analysis.proposal });
      const message: Message = {
        id: randomUUID(), projectId, authorMemberId: member.id, content: input.content,
        taskId: decision.taskId, candidateTaskIds: decision.candidateTaskIds,
        resolution: decision.resolution, clarificationQuestion: decision.question,
        aiMode: analysis.aiMode, createdAt: new Date().toISOString(),
      };
      await repo.insertMessage(message);
      if (decision.resolution !== "applied" || !decision.requestedStatus) return { message, progressUpdate: null, task: null };
      const task = current.find(item => item.id === decision.taskId);
      const prior = snapshot.find(item => item.id === decision.taskId);
      if (!task || !prior || task.version !== prior.version) throw new ApiError(409, "VERSION_CONFLICT", "Công việc đã thay đổi trong lúc xử lý. Hãy tải lại.");
      const nextTask: Task = { ...task, status: decision.requestedStatus, version: task.version + 1 };
      const update = progressRecord(message, task, decision.requestedStatus, decision.blocker);
      await repo.commitProgressUpdate(message, update, nextTask, task.version);
      return { message, progressUpdate: update, task: nextTask };
    });
  },
  async resolveTaskReference(session: Session, messageId: string, input: ResolveTaskReferenceInput, options: MutationOptions): Promise<ProgressMessageResult> {
    await verifyResolve(getDb(), session, messageId, input.taskId);
    const request = requestFor(session, "POST /api/messages/" + messageId + "/resolve", input, options);
    return runIdempotent(request, progressMessageResultSchema, async tx => {
      await verifyResolve(tx, session, messageId, input.taskId);
    }, async tx => {
      // Serialize confirmations with different keys for the same source message.
      await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.id, messageId))).for("update");
      const { message, task } = await verifyResolve(tx, session, messageId, input.taskId);
      if (message.resolution !== "clarification_required") throw new ApiError(409, "INVALID_TRANSITION", "Tin nhắn đã được xử lý; không thể cập nhật lần nữa.");
      if (!supportsChatProgress(task.status)) throw new ApiError(409, "INVALID_TRANSITION", "Trạng thái hiện tại cần luồng nộp bài hoặc nghiệm thu.");
      if (task.version !== input.expectedTaskVersion) throw new ApiError(409, "VERSION_CONFLICT", "Công việc đã thay đổi. Hãy tải lại trước khi xác nhận.");
      const blocker = input.requestedStatus === "blocked" ? input.blocker?.trim() : null;
      if (input.requestedStatus === "blocked" && !blocker) throw new ApiError(422, "VALIDATION_ERROR", "Cần mô tả trở ngại cụ thể.");
      const resolved: Message = { ...message, taskId: task.id, resolution: "applied", clarificationQuestion: null, candidateTaskIds: [] };
      const nextTask: Task = { ...task, status: input.requestedStatus, version: task.version + 1 };
      const update = progressRecord(resolved, task, input.requestedStatus, blocker || null);
      if (blocker) update.note = message.content + "\nTrở ngại được tác giả xác nhận: " + blocker;
      await new NeonTrackingRepository(tx).commitProgressUpdate(resolved, update, nextTask, input.expectedTaskVersion);
      return { message: resolved, progressUpdate: update, task: nextTask };
    });
  },
};
