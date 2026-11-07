import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { plans, projectMembers, projects, tasks, users } from "@/server/db/schema";
import { toProject, toUser } from "@/server/db/mappers";
import { requireMembership } from "@/server/auth";
import type { Session } from "@/server/auth/contracts";
import type { ProjectSummary } from "@/contracts/project";

export async function listProjectSummaries(session: Session): Promise<ProjectSummary[]> {
  const db = getDb();
  const joined = await db.select({ project: projects }).from(projects)
    .innerJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, session.user.id)));
  if (!joined.length) return [];
  const ids = joined.map(row => row.project.id);
  const [memberRows, planRows, taskRows] = await Promise.all([
    db.select().from(projectMembers).where(inArray(projectMembers.projectId, ids)),
    db.select({ projectId: plans.projectId, status: plans.status }).from(plans).where(inArray(plans.projectId, ids)),
    db.select({ projectId: tasks.projectId, status: tasks.status }).from(tasks)
      .innerJoin(plans, and(eq(tasks.planId, plans.id), eq(tasks.projectId, plans.projectId)))
      .where(and(inArray(tasks.projectId, ids), eq(plans.status, "published"))),
  ]);
  return joined.map(({ project }) => {
    const projectTasks = taskRows.filter(task => task.projectId === project.id);
    return {
      ...toProject(project),
      planStatus: planRows.find(plan => plan.projectId === project.id)?.status ?? null,
      memberCount: memberRows.filter(member => member.projectId === project.id).length,
      taskCounts: { total: projectTasks.length, done: projectTasks.filter(task => task.status === "done").length, blocked: projectTasks.filter(task => task.status === "blocked").length },
    };
  });
}
export async function listProjectMembers(session: Session, projectId: string) {
  await requireMembership(getDb(), session, projectId);
  return getDb().select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
}
export async function listDemoUsers() {
  return (await getDb().select().from(users).where(isNotNull(users.demoAccount))).map(toUser);
}
