import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { submitProgressMessageInputSchema, resolveTaskReferenceInputSchema, type Message, type ProgressMessageResult, type Task, type ProjectMember } from "@/contracts";
import { getDb, type Database, type Transaction } from "@/server/db/client";
import { messages, tasks, progressUpdates } from "@/server/db/schema";
import { projectMember, taskWithMember, assertUpdater } from "@/server/auth/access";
import type { Session } from "@/server/auth/contracts";
import { assert, conflict, notFound } from "@/server/http/errors";
import { commitMutation, mutationIdentity, replay } from "@/server/db/mutations";
import { createCoordinator, type Coordinator } from "./coordinator";
import { trackingReader } from "./store";
import type { TrackingService } from "./service";

const mutable = (task: Task) => ["todo", "in_progress", "blocked"].includes(task.status);
const canUpdate = (member: ProjectMember, task: Task) => member.role === "leader" || task.assigneeMemberId === member.id;
export function createTrackingService(db: Database, coordinator: Coordinator = createCoordinator()): TrackingService {
  const reader = trackingReader(db);
  return {
    async listTasks(session, projectId) { await projectMember(db, session, projectId); return reader.listTasks(projectId); },
    async getTask(session, id) { return (await taskWithMember(db, session, id)).task; },
    async listMessages(session, projectId) { await projectMember(db, session, projectId); return reader.listMessages(projectId); },
    async listProgressUpdates(session, id) { await taskWithMember(db, session, id); return reader.listProgressUpdates(id); },
    async submitProgressMessage(session, projectId, rawInput, options) {
      const input = submitProgressMessageInputSchema.parse(rawInput);
      await projectMember(db, session, projectId);
      const identity = mutationIdentity(session.user.id, `POST /api/projects/${projectId}/messages`, options.idempotencyKey, input);
      const saved = await replay<ProgressMessageResult>(db, identity); if (saved !== undefined) return saved;
      const availableTasks = await reader.listTasks(projectId);
      if (input.taskId) assert(availableTasks.some((t) => t.id === input.taskId), 422, "VALIDATION_ERROR", "Công việc không thuộc kế hoạch đã công bố của dự án.");
      const result = await coordinator({ message: { content: input.content, taskId: input.taskId ?? null }, tasks: availableTasks });
      const proposal = result.proposal;
      const target = availableTasks.find((t) => t.id === proposal.taskId);
      assert(!proposal.taskId || target, 502, "AI_INVALID_OUTPUT", "Coordinator tham chiếu công việc không hợp lệ.");
      const ambiguous = proposal.intent === "clarify" || (proposal.intent === "update" && (!target || !proposal.requestedStatus || (input.taskId && input.taskId !== target.id) || (proposal.requestedStatus === "blocked" && !proposal.blocker?.trim())));
      return commitMutation(db, identity, async (tx) => {
        const actor = await projectMember(tx, session, projectId);
        const message: Message = {
          id: randomUUID(), projectId, authorMemberId: actor.id, content: input.content,
          taskId: ambiguous ? null : target?.id ?? input.taskId ?? null,
          candidateTaskIds: ambiguous ? availableTasks.filter((t) => canUpdate(actor, t) && mutable(t)).map((t) => t.id) : [],
          resolution: ambiguous ? "clarification_required" : "no_change",
          clarificationQuestion: ambiguous ? proposal.clarificationQuestion ?? "Chọn công việc, trạng thái muốn cập nhật và mô tả trở ngại nếu có." : null,
          aiMode: result.aiMode, createdAt: new Date().toISOString(),
        };
        if (!ambiguous && proposal.intent === "update" && target && canUpdate(actor, target) && mutable(target)) {
          const current = await lockTask(tx, session, target.id);
          if (current.task.version !== target.version) throw conflict();
          assertUpdater(current.member, current.task);
          assert(mutable(current.task), 409, "INVALID_TRANSITION", "Trạng thái hiện tại cần đi qua nộp bài/review.");
          return apply(tx, message, current.task, proposal.requestedStatus!, proposal.blocker ?? null, true);
        }
        await tx.insert(messages).values(message);
        return { message, progressUpdate: null, task: null };
      });
    },
    async resolveTaskReference(session, messageId, rawInput, options) {
      const input = resolveTaskReferenceInputSchema.parse(rawInput);
      const message = await reader.getMessage(messageId); if (!message) throw notFound();
      const member = await projectMember(db, session, message.projectId);
      assert(member.id === message.authorMemberId, 403, "FORBIDDEN", "Chỉ tác giả được làm rõ tin nhắn.");
      const access = await taskWithMember(db, session, input.taskId);
      assert(access.task.projectId === message.projectId, 422, "VALIDATION_ERROR", "Công việc không cùng dự án.");
      assertUpdater(access.member, access.task);
      const identity = mutationIdentity(session.user.id, `POST /api/messages/${messageId}/resolve`, options.idempotencyKey, input);
      return commitMutation(db, identity, async (tx) => {
        // A per-message lock serializes two different keys resolving the same message.
        const [current] = await tx.select().from(messages).where(eq(messages.id, messageId)).for("update");
        const actor = await projectMember(tx, session, current.projectId);
        assert(actor.id === current.authorMemberId, 403, "FORBIDDEN", "Chỉ tác giả được làm rõ tin nhắn.");
        assert(current.resolution === "clarification_required", 409, "INVALID_TRANSITION", "Tin nhắn đã được xử lý; hãy tải lại lịch sử chat.");
        const { task, member: updater } = await lockTask(tx, session, input.taskId);
        assert(task.projectId === current.projectId, 422, "VALIDATION_ERROR", "Công việc không cùng dự án.");
        assertUpdater(updater, task);
        if (task.version !== input.expectedTaskVersion) throw conflict();
        assert(mutable(task), 409, "INVALID_TRANSITION", "Công việc đang review hoặc đã hoàn thành; hãy dùng luồng nộp bài.");
        return apply(tx, current, task, input.requestedStatus, input.blocker ?? null, false);
      });
    },
  };
}
async function lockTask(tx: Transaction, session: Session, id: string) {
  const [task] = await tx.select().from(tasks).where(eq(tasks.id, id)).for("update"); if (!task) throw notFound();
  return { task, member: await projectMember(tx, session, task.projectId) };
}
async function apply(tx: Transaction, original: Message, task: Task, status: "in_progress" | "blocked", blocker: string | null, insert: boolean): Promise<ProgressMessageResult> {
  assert(status !== "blocked" || blocker?.trim(), 422, "VALIDATION_ERROR", "Cần mô tả trở ngại.");
  const message: Message = { ...original, taskId: task.id, resolution: "applied", candidateTaskIds: [], clarificationQuestion: null };
  const progressUpdate = { id: randomUUID(), projectId: task.projectId, taskId: task.id, messageId: message.id, authorMemberId: message.authorMemberId, statusBefore: task.status, statusAfter: status, note: message.content, blocker: status === "blocked" ? blocker : null, createdAt: new Date().toISOString() };
  if (insert) await tx.insert(messages).values(message);
  else await tx.update(messages).set(message).where(eq(messages.id, message.id));
  const [updated] = await tx.update(tasks).set({ status, version: task.version + 1 }).where(and(eq(tasks.id, task.id), eq(tasks.version, task.version))).returning();
  if (!updated) throw conflict();
  await tx.insert(progressUpdates).values(progressUpdate);
  return { message, progressUpdate, task: updated };
}
export const trackingService: TrackingService = {
  listTasks: (...a) => createTrackingService(getDb()).listTasks(...a), getTask: (...a) => createTrackingService(getDb()).getTask(...a),
  listMessages: (...a) => createTrackingService(getDb()).listMessages(...a), listProgressUpdates: (...a) => createTrackingService(getDb()).listProgressUpdates(...a),
  submitProgressMessage: (...a) => createTrackingService(getDb()).submitProgressMessage(...a), resolveTaskReference: (...a) => createTrackingService(getDb()).resolveTaskReference(...a),
};
