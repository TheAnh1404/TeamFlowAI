import type { Project, Task } from "@/contracts";

/** Progress is accepted work / published work. It is never inferred from chat. */
export function projectSupervision(project: Project, tasks: Task[], asOf: string) {
  const total = tasks.length;
  const accepted = tasks.filter(t => t.status === "done").length;
  const start = Date.parse(project.createdAt), deadline = Date.parse(project.deadline), now = Date.parse(asOf);
  if (![start, deadline, now].every(Number.isFinite) || deadline <= start) throw Error("Invalid project timeline");
  const elapsed = Math.max(0, Math.min(1, (now - start) / (deadline - start)));
  const progressPercent = total ? Math.round(accepted / total * 1000) / 10 : null;
  const deadlineRisk = total > 0 && elapsed >= 0.8 && accepted * 100 <= total * 80;
  return {
    asOf, total, accepted, progressPercent,
    elapsedPercent: Math.round(elapsed * 1000) / 10,
    reminderAt: new Date(start + (deadline - start) * 0.8).toISOString(),
    deadlineRisk,
    overdue: now > deadline && accepted < total,
    remainingMs: Math.max(0, deadline - now),
    awaitingAcceptance: tasks.filter(t => t.status === "in_review").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
    timeline: [...tasks].sort((a,b) => Date.parse(a.deadline) - Date.parse(b.deadline) || a.id.localeCompare(b.id)).map(task => ({
      taskId: task.id, title: task.title, assigneeMemberId: task.assigneeMemberId, deadline: task.deadline,
      status: task.status, overdue: Date.parse(task.deadline) < now && task.status !== "done",
      dependenciesPending: task.dependencyTaskIds.filter(id => tasks.find(t => t.id === id)?.status !== "done"),
    })),
  };
}
