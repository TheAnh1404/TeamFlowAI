import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { DataConnection } from "@/server/db/client";
import { tasks, plans, messages, progressUpdates } from "@/server/db/schema";

export function trackingReader(db: DataConnection) {
  return {
    async listTasks(projectId: string) {
      const rows = await db.select({ task: tasks }).from(tasks).innerJoin(plans, and(eq(tasks.planId, plans.id), eq(plans.status, "published"))).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.createdAt), asc(tasks.id));
      return rows.map((row) => row.task);
    },
    async getTask(id: string) { return (await db.select().from(tasks).where(eq(tasks.id, id)))[0] ?? null; },
    async getMessage(id: string) { return (await db.select().from(messages).where(eq(messages.id, id)))[0] ?? null; },
    listMessages: (projectId: string) => db.select().from(messages).where(eq(messages.projectId, projectId)).orderBy(asc(messages.createdAt), asc(messages.id)),
    listProgressUpdates: (taskId: string) => db.select().from(progressUpdates).where(eq(progressUpdates.taskId, taskId)).orderBy(asc(progressUpdates.createdAt), asc(progressUpdates.id)),
  };
}
