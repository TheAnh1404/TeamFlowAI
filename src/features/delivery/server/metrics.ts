import type { ReportMetrics } from "@/contracts";
import type { ReportAiInput } from "@/server/ai/contracts";

export function calculateReportMetrics(sources: ReportAiInput["sources"], start: string, end: string, asOf: string): ReportMetrics {
  const lo = Date.parse(start), hi = Date.parse(end), now = Date.parse(asOf);
  const inPeriod = (value: string) => Date.parse(value) >= lo && Date.parse(value) < hi;
  const metrics: ReportMetrics = {
    statusCounts: { todo: 0, in_progress: 0, blocked: 0, in_review: 0, changes_requested: 0, done: 0 },
    dueInPeriodTotal: 0, submittedOnTimeTotal: 0, acceptedOnTimeTotal: 0, overdueOpenTotal: 0,
    submissionsInPeriodTotal: sources.submissions.filter(s => inPeriod(s.submittedAt)).length,
    progressUpdatesInPeriodTotal: sources.progressUpdates.filter(p => inPeriod(p.createdAt)).length,
  };
  for (const task of sources.tasks) {
    metrics.statusCounts[task.status]++;
    const deadline = Date.parse(task.deadline);
    if (inPeriod(task.deadline)) {
      metrics.dueInPeriodTotal++;
      const submitted = sources.submissions.filter(s => s.taskId === task.id).map(s => Date.parse(s.submittedAt));
      if (submitted.length && Math.min(...submitted) <= deadline) metrics.submittedOnTimeTotal++;
      if (task.acceptedAt && Date.parse(task.acceptedAt) <= deadline) metrics.acceptedOnTimeTotal++;
    }
    if (deadline < now && task.status !== "done") metrics.overdueOpenTotal++;
  }
  return metrics;
}
