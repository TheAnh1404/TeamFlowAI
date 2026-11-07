// Public, client-safe entry. TODO(TV2): explicitly export tracking/task-shell UI here.
// Never export server implementations into the client-facing entry.
export type { Task, Message, ProgressUpdate } from "@/contracts";
export { TrackingWorkbench } from "./components/workbench";
export type { WorkbenchProps, DeliverySlotProps } from "./components/workbench";
export { TaskDetailPanel, StatusBadge } from "./components/task-detail";
export { DemoSessionBar } from "./components/session-bar";
export type { WorkspaceData } from "./model";
