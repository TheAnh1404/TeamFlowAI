import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Message, ProgressUpdate, Task } from "@/contracts";
import type { DatabaseReader } from "@/server/db/client";
import { messages, plans, progressUpdates, tasks } from "@/server/db/schema";
import { toMessage, toProgressUpdate, toTask } from "@/server/db/mappers";
import { ApiError } from "@/server/http/api-error";
import type { TrackingRepository } from "./repository";

// Mutation methods must be called inside runIdempotent's transaction.
export class NeonTrackingRepository implements TrackingRepository {
  constructor(private readonly db: DatabaseReader) {}
  async listTasks(projectId: string) {
    const rows = await this.db.select({ task: tasks }).from(tasks).innerJoin(plans, and(eq(tasks.planId, plans.id), eq(tasks.projectId, plans.projectId)))
      .where(and(eq(tasks.projectId, projectId), eq(plans.status, "published"))).orderBy(asc(tasks.deadline), asc(tasks.id));
    if (!rows.length) return [];
    const latest = await this.db.selectDistinctOn([progressUpdates.taskId]).from(progressUpdates)
      .where(eq(progressUpdates.projectId, projectId)).orderBy(asc(progressUpdates.taskId), desc(progressUpdates.createdAt), desc(progressUpdates.id));
    const progressByTask = new Map(latest.map(update => [update.taskId, toProgressUpdate(update)]));
    return rows.map(row => ({ ...toTask(row.task), latestProgressUpdate: progressByTask.get(row.task.id) ?? null }));
  }
  async getTask(taskId: string) {
    const [row] = await this.db.select({ task: tasks }).from(tasks).innerJoin(plans, and(eq(tasks.planId, plans.id), eq(tasks.projectId, plans.projectId)))
      .where(and(eq(tasks.id, taskId), eq(plans.status, "published")));
    return row ? toTask(row.task) : null;
  }
  async listMessages(projectId: string) {
    return (await this.db.select().from(messages).where(eq(messages.projectId, projectId)).orderBy(asc(messages.createdAt), asc(messages.id))).map(toMessage);
  }
  async getMessage(messageId: string) {
    const [row] = await this.db.select().from(messages).where(eq(messages.id, messageId));
    return row ? toMessage(row) : null;
  }
  async listProgressUpdates(taskId: string) {
    return (await this.db.select().from(progressUpdates).where(eq(progressUpdates.taskId, taskId)).orderBy(asc(progressUpdates.createdAt), asc(progressUpdates.id))).map(toProgressUpdate);
  }
  async insertMessage(message: Message) {
    await this.db.insert(messages).values({ ...message, createdAt: new Date(message.createdAt) });
  }
  async commitProgressUpdate(message: Message, update: ProgressUpdate, task: Task, expectedVersion: number) {
    const [changed] = await this.db.update(tasks).set({ status: task.status, version: sql`${tasks.version} + 1` })
      .where(and(eq(tasks.id, task.id), eq(tasks.projectId, task.projectId), eq(tasks.version, expectedVersion))).returning({ id: tasks.id });
    if (!changed) throw new ApiError(409, "VERSION_CONFLICT", "Công việc đã thay đổi. Hãy tải lại trước khi xác nhận.");
    await this.db.insert(progressUpdates).values({ ...update, createdAt: new Date(update.createdAt) });
    await this.db.update(messages).set({ taskId: message.taskId, resolution: message.resolution, clarificationQuestion: message.clarificationQuestion, candidateTaskIds: message.candidateTaskIds })
      .where(eq(messages.id, message.id));
  }
}
