import "server-only";
import { and, eq, lte, sql } from "drizzle-orm";
import { getDb, type Database } from "./client";
import { tasks, plans, messages, progressUpdates, submissions, reviews } from "./schema";
import { projectMember } from "@/server/auth/access";
import type { Session } from "@/server/auth/contracts";
import type { ReportAiInput } from "@/server/ai/contracts";

// TV3 computes metrics/summary and persists its report from this fixed source snapshot.
export async function readReportSnapshot(session: Session, projectId: string, db: Database = getDb()): Promise<{ asOf: string; sources: ReportAiInput["sources"] }> {
  return db.transaction(async (tx) => {
    await projectMember(tx, session, projectId);
    const time = await tx.execute<{ timestamp: string }>(sql`select transaction_timestamp()::text as timestamp`);
    const asOf = new Date(time.rows[0].timestamp).toISOString();
    const taskRows = await tx.select({ task: tasks }).from(tasks).innerJoin(plans, and(eq(tasks.planId, plans.id), eq(plans.status, "published"))).where(and(eq(tasks.projectId, projectId), lte(tasks.createdAt, asOf)));
    return { asOf, sources: {
      tasks: taskRows.map((r) => r.task),
      messages: await tx.select().from(messages).where(and(eq(messages.projectId, projectId), lte(messages.createdAt, asOf))),
      progressUpdates: await tx.select().from(progressUpdates).where(and(eq(progressUpdates.projectId, projectId), lte(progressUpdates.createdAt, asOf))),
      submissions: await tx.select().from(submissions).where(and(eq(submissions.projectId, projectId), lte(submissions.submittedAt, asOf))),
      reviews: await tx.select().from(reviews).where(and(eq(reviews.projectId, projectId), lte(reviews.createdAt, asOf))),
    } };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
