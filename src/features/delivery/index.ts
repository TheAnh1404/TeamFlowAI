// Public, client-safe entry for TV2 and other features
import React from "react";
import type { Task } from "@/contracts";
import { DeliveryWorkspace } from "./components/DeliveryWorkspace";

export type { Submission, Review, WeeklyReport } from "@/contracts";

export { SubmissionForm } from "./components/SubmissionForm";
export { SubmissionHistory } from "./components/SubmissionHistory";
export { ReviewPanel } from "./components/ReviewPanel";
export { AcceptanceActions } from "./components/AcceptanceActions";
export { DeliveryWorkspace } from "./components/DeliveryWorkspace";
export { ReportSourcesDrawer } from "./components/ReportSourcesDrawer";
export { WeeklyReportView } from "./components/WeeklyReportView";

/**
 * Adapter chuẩn để TV2 gắn vào TrackingWorkbench qua prop `renderDelivery`:
 * `renderDelivery={(props) => <DeliverySlot {...props} />}`
 */
export interface DeliverySlotProps {
  task: Task;
  currentMember?: {
    id: string;
    role: string;
    canAccept?: boolean;
  };
  onTaskChange?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function DeliverySlot({
  task,
  currentMember,
  onTaskChange,
  onDirtyChange,
}: DeliverySlotProps) {
  const canAccept = currentMember
    ? currentMember.role === "leader" || Boolean(currentMember.canAccept)
    : false;
  const canSubmit = currentMember
    ? currentMember.role === "leader" || currentMember.id === task.assigneeMemberId
    : false;

  return React.createElement(DeliveryWorkspace, {
    task,
    canAccept,
    canSubmit,
    onTaskUpdated: () => onTaskChange?.(),
    onDirtyChange,
  });
}

