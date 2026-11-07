import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, type Database } from "./client";
import { projects, projectMembers, plans, tasks, projectMentors } from "./schema";
import type { Session } from "@/server/auth/contracts";

export async function listSessionProjects(session: Session, db: Database = getDb()) {
  return db.transaction(async (tx) => {
    const memberRows = await tx
      .select({ project: projects, member: projectMembers, planStatus: plans.status })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .leftJoin(plans, eq(plans.projectId, projects.id))
      .where(eq(projectMembers.userId, session.user.id))
      .orderBy(projects.createdAt);

    // Also include projects where user is a read-only mentor
    const mentorRows = await tx
      .select({ project: projects, planStatus: plans.status })
      .from(projectMentors)
      .innerJoin(projects, eq(projects.id, projectMentors.projectId))
      .leftJoin(plans, eq(plans.projectId, projects.id))
      .where(eq(projectMentors.userId, session.user.id))
      .orderBy(projects.createdAt);

    const existingProjectIds = new Set(memberRows.map((r) => r.project.id));
    const allRows = [
      ...memberRows,
      ...mentorRows
        .filter((r) => !existingProjectIds.has(r.project.id))
        .map((r) => ({
          ...r,
          member: {
            id: `mentor-${session.user.id}`,
            projectId: r.project.id,
            userId: session.user.id,
            role: "mentor" as const,
            canAccept: false,
            skills: [] as string[],
            availableHoursPerWeek: 0,
          },
        })),
    ];

    const result = [];
    for (const row of allRows) {
      const rowsOfTasks = await tx
        .select({ task: tasks })
        .from(tasks)
        .innerJoin(plans, and(eq(tasks.planId, plans.id), eq(plans.status, "published")))
        .where(eq(tasks.projectId, row.project.id));

      const taskTotal = rowsOfTasks.length;
      const doneTotal = rowsOfTasks.filter((t) => t.task.status === "done").length;
      const myTaskTotal = rowsOfTasks.filter((t) => t.task.assigneeMemberId === row.member.id).length;
      const myDoneTotal = rowsOfTasks.filter((t) => t.task.assigneeMemberId === row.member.id && t.task.status === "done").length;

      result.push({
        ...row,
        taskTotal,
        doneTotal,
        myTaskTotal,
        myDoneTotal,
      });
    }
    return result;
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
