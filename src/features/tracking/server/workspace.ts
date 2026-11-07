import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { projects, projectMembers, users, progressUpdates } from "@/server/db/schema";
import type { Session } from "@/server/auth/contracts";
import { projectMember } from "@/server/auth/access";
import { notFound } from "@/server/http/errors";
import { trackingReader } from "./store";
import type { WorkspaceData } from "../model";

export async function loadWorkspace(session: Session, projectId: string): Promise<WorkspaceData> {
  return getDb().transaction(async (tx) => {
    const actor = await projectMember(tx, session, projectId);
    const [project] = await tx.select().from(projects).where(eq(projects.id, projectId)); if (!project) throw notFound();
    const members = await tx.select({ member: projectMembers, user: users }).from(projectMembers).innerJoin(users, eq(users.id, projectMembers.userId)).where(eq(projectMembers.projectId, projectId));
    const reader = trackingReader(tx);
    return { asOf: new Date().toISOString(), project, actor, members, tasks: await reader.listTasks(projectId), messages: await reader.listMessages(projectId), updates: await tx.select().from(progressUpdates).where(eq(progressUpdates.projectId, projectId)).orderBy(progressUpdates.createdAt, progressUpdates.id) };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
