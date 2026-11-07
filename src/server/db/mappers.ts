import type { Message, Plan, ProgressUpdate, Project, Review, Submission, Task, User, WeeklyReport } from "@/contracts";
import type * as tables from "./schema";

const toIso = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  return typeof value === "string" ? value : (value as Date).toISOString();
};

const toIsoReq = (value: string | Date): string => {
  return typeof value === "string" ? value : (value as Date).toISOString();
};

export function toUser(row: typeof tables.users.$inferSelect): User {
  return { id: row.id, displayName: row.displayName, createdAt: toIsoReq(row.createdAt) };
}
export function toProject(row: typeof tables.projects.$inferSelect): Project {
  return { ...row, deadline: toIsoReq(row.deadline), createdAt: toIsoReq(row.createdAt) };
}
export function toPlan(row: typeof tables.plans.$inferSelect): Plan {
  return { ...row, publishedAt: toIso(row.publishedAt), createdAt: toIsoReq(row.createdAt) };
}
export function toTask(row: typeof tables.tasks.$inferSelect): Task {
  return { ...row, deadline: toIsoReq(row.deadline), acceptedAt: toIso(row.acceptedAt), createdAt: toIsoReq(row.createdAt) };
}
export function toMessage(row: typeof tables.messages.$inferSelect): Message {
  return { ...row, createdAt: toIsoReq(row.createdAt) };
}
export function toProgressUpdate(row: typeof tables.progressUpdates.$inferSelect): ProgressUpdate {
  return { ...row, createdAt: toIsoReq(row.createdAt) };
}
export function toSubmission(row: typeof tables.submissions.$inferSelect): Submission {
  return { ...row, submittedAt: toIsoReq(row.submittedAt) };
}
export function toReview(row: typeof tables.reviews.$inferSelect): Review {
  return { ...row, createdAt: toIsoReq(row.createdAt) };
}
export function toWeeklyReport(row: typeof tables.weeklyReports.$inferSelect): WeeklyReport {
  return {
    ...row,
    periodStart: toIsoReq(row.periodStart),
    periodEnd: toIsoReq(row.periodEnd),
    asOf: toIsoReq(row.asOf),
    createdAt: toIsoReq(row.createdAt),
  };
}
