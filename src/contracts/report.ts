import { z } from "zod";
import { idSchema, instantSchema } from "./common";
import { aiModeSchema, taskStatusSchema } from "./enums";

export const sourceRefSchema = z.object({
  entity: z.enum(["Task", "Message", "ProgressUpdate", "Submission", "Review"]),
  id: idSchema,
});
export const summaryItemSchema = z.object({
  text: z.string(),
  sourceRefs: z.array(sourceRefSchema),
  metricKeys: z.array(z.string()),
});
export const reportMetricsSchema = z.object({
  statusCounts: z.record(taskStatusSchema, z.number().int()),
  dueInPeriodTotal: z.number().int(),
  submittedOnTimeTotal: z.number().int(),
  acceptedOnTimeTotal: z.number().int(),
  overdueOpenTotal: z.number().int(),
  submissionsInPeriodTotal: z.number().int(),
  progressUpdatesInPeriodTotal: z.number().int(),
});
export const weeklyReportSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  generatedByMemberId: idSchema,
  periodStart: instantSchema,
  periodEnd: instantSchema,
  asOf: instantSchema,
  metrics: reportMetricsSchema,
  sourceRefs: z.array(sourceRefSchema),
  summary: z.array(summaryItemSchema),
  aiMode: aiModeSchema,
  createdAt: instantSchema,
});
export const generateWeeklyReportInputSchema = weeklyReportSchema.pick({ periodStart: true, periodEnd: true });

export type SourceRef = z.infer<typeof sourceRefSchema>;
export type SummaryItem = z.infer<typeof summaryItemSchema>;
export type ReportMetrics = z.infer<typeof reportMetricsSchema>;
export type WeeklyReport = z.infer<typeof weeklyReportSchema>;
export type GenerateWeeklyReportInput = z.infer<typeof generateWeeklyReportInputSchema>;
