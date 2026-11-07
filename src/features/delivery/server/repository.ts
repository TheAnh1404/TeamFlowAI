import "server-only";
import { desc, eq } from "drizzle-orm";
import type { DataConnection } from "@/server/db/client";
import { submissions, reviews, tasks } from "@/server/db/schema";
import { projectMember } from "@/server/auth/access";
import type { Session } from "@/server/auth/contracts";
import { notFound } from "@/server/http/errors";

export function listTaskSubmissions(db: DataConnection, taskId: string) {
  return db.select().from(submissions).where(eq(submissions.taskId, taskId)).orderBy(desc(submissions.revision));
}
export async function submissionWithMember(db: DataConnection, session: Session, id: string) {
  const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!submission) throw notFound();
  return { submission, member: await projectMember(db, session, submission.projectId) };
}
export async function findReview(db: DataConnection, submissionId: string) {
  const [review] = await db.select().from(reviews).where(eq(reviews.submissionId, submissionId));
  return review ?? null;
}
export async function lockDeliveryTask(db: DataConnection, session: Session, id: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).for("update");
  if (!task) throw notFound();
  return { task, member: await projectMember(db, session, task.projectId) };
}
