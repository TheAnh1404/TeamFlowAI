import type { Message, Plan, ProgressUpdate, Project, Review, Submission, Task, User, WeeklyReport } from "@/contracts";
import type * as tables from "./schema";

export function toUser(row: typeof tables.users.$inferSelect): User {
  return { id: row.id, displayName: row.displayName, createdAt: row.createdAt.toISOString() };
}
export function toProject(row: typeof tables.projects.$inferSelect): Project {
  return { ...row, deadline: row.deadline.toISOString(), createdAt: row.createdAt.toISOString() };
}
export function toPlan(row: typeof tables.plans.$inferSelect): Plan {
  return { ...row, publishedAt: row.publishedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() };
}
export function toTask(row: typeof tables.tasks.$inferSelect): Task {
  return { ...row, deadline: row.deadline.toISOString(), acceptedAt: row.acceptedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() };
}
export function toMessage(row: typeof tables.messages.$inferSelect): Message {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
export function toProgressUpdate(row: typeof tables.progressUpdates.$inferSelect): ProgressUpdate {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
export function toSubmission(row: typeof tables.submissions.$inferSelect): Submission {
  return { ...row, submittedAt: row.submittedAt.toISOString() };
}
export function toReview(row: typeof tables.reviews.$inferSelect): Review {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
export function toWeeklyReport(row: typeof tables.weeklyReports.$inferSelect): WeeklyReport {
  return { ...row, periodStart: row.periodStart.toISOString(), periodEnd: row.periodEnd.toISOString(), asOf: row.asOf.toISOString(), createdAt: row.createdAt.toISOString() };
}
