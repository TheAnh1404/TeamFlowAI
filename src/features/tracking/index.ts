// Public, client-safe tracking/task-shell UI entry.
// Never export server implementations into the client-facing entry.
export type { Task, Message, ProgressUpdate } from "@/contracts";
export { ProjectsPage } from "./components/projects-page";
export { TaskList } from "./components/task-list";
export { TaskDetail } from "./components/task-detail";
export { ProjectChat } from "./components/chat";
export { TrackingWorkbench } from "./components/workbench";
export type { WorkbenchProps, DeliverySlotProps } from "./components/workbench";
export { TaskDetailPanel, StatusBadge } from "./components/task-detail";
export { DemoSessionBar } from "./components/session-bar";
export type { WorkspaceData } from "./model";
