import type { ProjectMember, Task } from "@/contracts";
import type { TrackingAiProposal } from "@/server/ai/contracts";

type TrackingTask = Pick<Task, "id" | "projectId" | "assigneeMemberId" | "status">;
type TrackingMember = Pick<ProjectMember, "id" | "projectId" | "role">;
export interface ProgressDecision {
  resolution: "applied" | "clarification_required" | "no_change";
  taskId: string | null;
  candidateTaskIds: string[];
  question: string | null;
  requestedStatus: "in_progress" | "blocked" | null;
  blocker: string | null;
}

export function canUpdateTask(member: TrackingMember, task: TrackingTask): boolean {
  return member.projectId === task.projectId && (member.role === "leader" || member.id === task.assigneeMemberId);
}
export function supportsChatProgress(status: Task["status"]): boolean {
  return status === "todo" || status === "in_progress" || status === "blocked";
}
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
export function mentionedTaskIds(content: string, tasks: readonly TrackingTask[]): string[] {
  const tokens = new Set(content.split(/[^\p{L}\p{N}_-]+/u));
  return tasks.filter(task => tokens.has(task.id)).map(task => task.id);
}

export function decideProgress(input: {
  member: TrackingMember;
  tasks: readonly TrackingTask[];
  selectedTaskId?: string;
  content: string;
  proposal: TrackingAiProposal;
}): ProgressDecision {
  const { member, tasks, selectedTaskId, content, proposal } = input;
  const mentioned = mentionedTaskIds(content, tasks);
  const proposedTask = tasks.find(task => task.id === proposal.taskId);
  const trustedTaskId = selectedTaskId ?? (mentioned.length === 1 ? mentioned[0] : undefined);
  const task = tasks.find(item => item.id === trustedTaskId);
  const candidates = [...new Set([...(proposedTask ? [proposedTask.id] : []), ...mentioned, ...(task ? [task.id] : [])])];
  const base: ProgressDecision = { resolution: "no_change", taskId: task?.id ?? null, candidateTaskIds: [], question: null, requestedStatus: null, blocker: null };
  const clarify = (question: string): ProgressDecision => ({ ...base, resolution: "clarification_required", candidateTaskIds: candidates, question });

  if (proposal.intent === "discussion") return base;
  if (!task || mentioned.length > 1 || (mentioned.length === 1 && selectedTaskId && mentioned[0] !== selectedTaskId) ||
      (proposal.taskId && proposal.taskId !== task.id)) {
    return clarify("Bạn muốn cập nhật công việc nào? Hãy chọn đúng công việc và xác nhận trạng thái.");
  }
  if (!canUpdateTask(member, task)) {
    return { ...base, question: "Tin nhắn đã lưu; chỉ người phụ trách hoặc trưởng nhóm được cập nhật công việc này." };
  }
  if (!supportsChatProgress(task.status)) {
    return { ...base, question: "Trạng thái hiện tại cần được xử lý qua nộp bài hoặc nghiệm thu; chat không thay đổi trạng thái." };
  }
  if (/\b(gan xong|hoan thanh|xong|khong bi chan|chua bat dau)\b/.test(normalize(content))) {
    return clarify("Hãy xác nhận đang làm hoặc bị chặn; chat không tự suy tiến độ hay nghiệm thu hoàn thành.");
  }
  if (proposal.intent === "clarify" || !proposal.requestedStatus) {
    return clarify(proposal.clarificationQuestion ?? "Bạn muốn ghi nhận đang làm hay bị chặn?");
  }
  const blocker = proposal.blocker?.trim() || null;
  if (proposal.requestedStatus === "blocked" && (!blocker || !normalize(content).includes(normalize(blocker)))) {
    return clarify("Công việc đang bị chặn bởi điều gì? Vui lòng bổ sung trở ngại cụ thể.");
  }
  return { ...base, resolution: "applied", requestedStatus: proposal.requestedStatus, blocker: proposal.requestedStatus === "blocked" ? blocker : null };
}
