import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "./client";
import { projects, projectMembers, plans, tasks } from "./schema";
import type { Session } from "@/server/auth/contracts";

export async function listSessionProjects(session: Session) {
  return getDb().transaction(async (tx) => {
    const rows = await tx.select({ project: projects, member: projectMembers, planStatus: plans.status }).from(projectMembers).innerJoin(projects, eq(projects.id, projectMembers.projectId)).leftJoin(plans, eq(plans.projectId, projects.id)).where(eq(projectMembers.userId, session.user.id)).orderBy(projects.createdAt);
    const result = [];
    for (const row of rows) {
      const rowsOfTasks = await tx.select({ task: tasks }).from(tasks).innerJoin(plans, and(eq(tasks.planId, plans.id), eq(plans.status, "published"))).where(eq(tasks.projectId, row.project.id));
      result.push({ ...row, taskTotal: rowsOfTasks.length, doneTotal: rowsOfTasks.filter((t) => t.task.status === "done").length });
    }
    return result;
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
