import "server-only";
import type { SummaryItem } from "@/contracts";
import type {

  ReportAiInput,


} from "./contracts";

export {detailedMockPlanner as generateMockPlanner} from "./planner-mock";

export {carefulMockCoordinator as generateMockCoordinator,carefulMockReviewer as generateMockReviewer} from "./mock-policies";

export function generateMockReport(input: ReportAiInput): SummaryItem[] {
  const { metrics, sources } = input;
  const summary: SummaryItem[] = [];

  // Ý 1: Tổng quan tiến độ và công việc đến hạn
  const dueTotal = metrics.dueInPeriodTotal;
  const acceptedTotal = metrics.acceptedOnTimeTotal;
  const overdueTotal = metrics.overdueOpenTotal;

  const taskRefs = sources.tasks.map((t) => ({ entity: "Task" as const, id: t.id }));
  summary.push({
    text: `Trong kỳ xét duyệt có ${dueTotal} công việc đến hạn; ${acceptedTotal} công việc trong nhóm này được nghiệm thu đúng hạn. Tại mốc chụp dữ liệu, toàn dự án có ${overdueTotal} công việc quá hạn chưa được nghiệm thu.`,
    sourceRefs: taskRefs.slice(0, 3),
    metricKeys: ["dueInPeriodTotal", "acceptedOnTimeTotal", "overdueOpenTotal"],
  });

  // Ý 2: Tình hình nộp bài và nghiệm thu
  const submissionRefs = sources.submissions.map((s) => ({ entity: "Submission" as const, id: s.id }));
  if (metrics.submissionsInPeriodTotal > 0 && submissionRefs.length > 0) {
    summary.push({
      text: `Nhóm đã ghi nhận ${metrics.submissionsInPeriodTotal} lượt nộp bài trong kỳ. Số lượt nộp không khẳng định chất lượng hoặc việc đã được nghiệm thu.`,
      sourceRefs: submissionRefs.slice(0, 3),
      metricKeys: ["submissionsInPeriodTotal"],
    });
  }

  // Ý 3: Trở ngại hoặc cập nhật tiến độ
  const progressRefs = sources.progressUpdates.map((p) => ({ entity: "ProgressUpdate" as const, id: p.id }));
  const blockedTasks = sources.tasks.filter((t) => t.status === "blocked");
  if (blockedTasks.length > 0) {
    summary.push({
      text: `Hiện có ${blockedTasks.length} công việc đang trong trạng thái bị chặn cần trưởng nhóm và các bên liên quan hỗ trợ tháo gỡ.`,
      sourceRefs: blockedTasks.map((t) => ({ entity: "Task" as const, id: t.id })),
      metricKeys: ["statusCounts"],
    });
  } else if (progressRefs.length > 0) {
    summary.push({
      text: `Có ${metrics.progressUpdatesInPeriodTotal} cập nhật tiến độ được ghi nhận qua kênh trao đổi. Dữ liệu này không đủ để kết luận mọi công việc đang đúng kế hoạch.`,
      sourceRefs: progressRefs.slice(0, 2),
      metricKeys: ["progressUpdatesInPeriodTotal"],
    });
  }

  if (summary.length === 0) {
    summary.push({
      text: "Chưa có đủ dữ liệu để nhận định tình hình triển khai trong kỳ. Vui lòng đối chiếu các chỉ số và nguồn đã lưu.",
      sourceRefs: taskRefs.slice(0, 1),
      metricKeys: ["statusCounts"],
    });
  }

  return summary;
}

