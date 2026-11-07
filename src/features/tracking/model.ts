import type { Message, ProgressUpdate, Project, ProjectMember, Task, User } from "@/contracts";
export interface WorkspaceData {
  asOf: string;
  project: Project;
  members: { member: ProjectMember; user: User }[];
  actor: ProjectMember;
  tasks: Task[];
  messages: Message[];
  updates: ProgressUpdate[];
}
export const statusLabels = {
  todo: "Chưa bắt đầu", in_progress: "Đang làm", blocked: "Bị chặn",
  in_review: "Chờ nghiệm thu", changes_requested: "Cần chỉnh sửa", done: "Đã hoàn thành",
} as const;
export function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone }).format(new Date(value));
}
