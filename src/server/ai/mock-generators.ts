import "server-only";
import type { CriterionResult, SummaryItem } from "@/contracts";
import type {
  PlanningAiInput, PlanningAiProposal, PlanningTaskProposal,
  ReportAiInput,
  ReviewAiInput, ReviewAiProposal,
  TrackingAiInput, TrackingAiProposal,
} from "./contracts";

export function generateMockPlanner(input: PlanningAiInput): PlanningAiProposal {
  const { project, members } = input;
  const deliverables = project.deliverables.length > 0 ? project.deliverables : ["Tài liệu yêu cầu", "Sản phẩm thử nghiệm"];
  const memberList = members.length > 0 ? members : [{ id: "m1", userId: "u1", role: "leader" as const, canAccept: true, skills: ["Quản lý", "Lập trình"], availableHoursPerWeek: 40 }];

  const tasks: PlanningTaskProposal[] = [];
  const projDeadline = new Date(project.deadline).getTime();
  const now = Date.now();
  const stepMs = Math.max(86400000, Math.floor((projDeadline - now) / (deliverables.length + 1)));

  deliverables.forEach((deliv, index) => {
    const tempKey = `draft-${index + 1}`;
    const assignedMember = memberList[index % memberList.length];
    const taskDeadlineTime = new Date(Math.min(projDeadline, now + stepMs * (index + 1))).toISOString();

    const criteria = [
      `Có tài liệu hoặc mã nguồn hoàn chỉnh cho: ${deliv}`,
      `Được kiểm thử và xác nhận hoạt động ổn định`,
      `Có hướng dẫn sử dụng và bàn giao cho nhóm`,
    ];

    const dependencyTempKeys = index > 0 ? [`draft-${index}`] : [];

    tasks.push({
      tempKey,
      title: `Thực hiện ${deliv}`,
      description: `Xây dựng, hoàn thiện và đối chiếu tiêu chí nghiệm thu cho đầu ra: ${deliv}.`,
      assigneeMemberId: assignedMember.id,
      deadline: taskDeadlineTime,
      criteria,
      dependencyTempKeys,
    });
  });

  return { tasks };
}

export function generateMockCoordinator(input: TrackingAiInput): TrackingAiProposal {
  const { message, tasks } = input;
  const content = message.content.toLowerCase();

  // Kiểm tra nếu có nhắc đến taskId cụ thể
  let matchedTask = message.taskId ? tasks.find((t) => t.id === message.taskId) : undefined;
  if (!matchedTask) {
    // Thử tìm theo tiêu đề
    matchedTask = tasks.find((t) => content.includes(t.title.toLowerCase()) || content.includes(t.id.toLowerCase()));
  }

  // Nhận diện trạng thái bị chặn
  if (content.includes("bị chặn") || content.includes("kẹt") || content.includes("vướng") || content.includes("lỗi") || content.includes("chờ")) {
    if (matchedTask) {
      return {
        intent: "update",
        taskId: matchedTask.id,
        requestedStatus: "blocked",
        blocker: message.content,
      };
    }
    return {
      intent: "clarify",
      clarificationQuestion: "Bạn đang gặp trở ngại ở công việc nào? Hãy chọn công việc cần đánh dấu bị chặn:",
    };
  }

  // Nhận diện bắt đầu làm
  if (content.includes("bắt đầu") || content.includes("đang làm") || content.includes("tiến hành") || content.includes("đang triển khai")) {
    if (matchedTask) {
      return {
        intent: "update",
        taskId: matchedTask.id,
        requestedStatus: "in_progress",
      };
    }
    return {
      intent: "clarify",
      clarificationQuestion: "Bạn đang bắt đầu thực hiện công việc nào dưới đây?",
    };
  }

  // Nhận diện nhắc xong việc
  if (content.includes("xong rồi") || content.includes("đã xong") || content.includes("hoàn thành")) {
    return {
      intent: "discussion",
      clarificationQuestion: "Để hoàn thành công việc chính thức, vui lòng chuyển sang mục Chi tiết công việc để nộp bài nghiệm thu.",
    };
  }

  return {
    intent: "discussion",
  };
}

export function generateMockReviewer(input: ReviewAiInput): ReviewAiProposal {
  const { submission } = input;
  const content = submission.content;
  const criteria = submission.criteriaSnapshot;
  const results: CriterionResult[] = [];

  // Tách các câu/dòng trong bài nộp
  const sentences = content
    .split(/\n+|\. +/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  for (const crit of criteria) {
    const critTextLower = crit.text.toLowerCase();
    const keywords = critTextLower
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    // Tìm câu có nhiều từ khóa khớp nhất
    let bestSentence = "";
    let maxMatch = 0;

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      let matchCount = 0;
      for (const kw of keywords) {
        if (sentenceLower.includes(kw)) {
          matchCount++;
        }
      }
      if (matchCount > maxMatch) {
        maxMatch = matchCount;
        bestSentence = sentence;
      }
    }

    if (maxMatch >= 1 && bestSentence) {
      // Đảm bảo quote chính xác 100% là chuỗi con trong content
      const startIndex = content.indexOf(bestSentence);
      const exactQuote = startIndex !== -1 ? content.slice(startIndex, startIndex + bestSentence.length) : bestSentence;

      results.push({
        criterionId: crit.id,
        verdict: "met",
        evidence: [{ submissionId: submission.id, quote: exactQuote }],
        missing: "",
        suggestion: "Tiêu chí đã được trình bày rõ ràng và có bằng chứng xác thực trong bài nộp.",
      });
    } else if (content.length > 30 && sentences.length > 0) {
      // Có nội dung nhưng không rõ ràng
      results.push({
        criterionId: crit.id,
        verdict: "insufficient_evidence",
        evidence: [],
        missing: `Bài nộp chưa thể hiện rõ tiêu chí: "${crit.text}".`,
        suggestion: "Bổ sung các bước cụ thể hoặc trích đoạn minh họa để chứng minh tiêu chí này.",
      });
    } else {
      // Nội dung quá sơ sài
      results.push({
        criterionId: crit.id,
        verdict: "insufficient_evidence",
        evidence: [],
        missing: `Chưa có thông tin hoặc bằng chứng liên quan tới: "${crit.text}".`,
        suggestion: "Vui lòng hoàn thiện nội dung và nộp lại bài để được đánh giá.",
      });
    }
  }

  const metCount = results.filter((r) => r.verdict === "met").length;
  const summary =
    metCount === criteria.length
      ? `Bài nộp đạt tất cả ${criteria.length} tiêu chí nghiệm thu. Đủ điều kiện để người có thẩm quyền xem xét nghiệm thu.`
      : `Bài nộp đạt ${metCount}/${criteria.length} tiêu chí. Vẫn còn tiêu chí chưa đủ bằng chứng hoặc cần bổ sung theo hướng dẫn.`;

  return { results, summary };
}

export function generateMockReport(input: ReportAiInput): SummaryItem[] {
  const { metrics, sources } = input;
  const summary: SummaryItem[] = [];

  // Ý 1: Tổng quan tiến độ và công việc đến hạn
  const dueTotal = metrics.dueInPeriodTotal;
  const acceptedTotal = metrics.acceptedOnTimeTotal;
  const overdueTotal = metrics.overdueOpenTotal;

  const taskRefs = sources.tasks.map((t) => ({ entity: "Task" as const, id: t.id }));
  summary.push({
    text: `Trong kỳ xét duyệt, nhóm có ${dueTotal} công việc đến hạn, trong đó ${acceptedTotal} công việc đã được nghiệm thu đúng hạn và ${overdueTotal} công việc đang quá hạn.`,
    sourceRefs: taskRefs.slice(0, 3),
    metricKeys: ["dueInPeriodTotal", "acceptedOnTimeTotal", "overdueOpenTotal"],
  });

  // Ý 2: Tình hình nộp bài và nghiệm thu
  const submissionRefs = sources.submissions.map((s) => ({ entity: "Submission" as const, id: s.id }));
  if (metrics.submissionsInPeriodTotal > 0 && submissionRefs.length > 0) {
    summary.push({
      text: `Nhóm đã ghi nhận ${metrics.submissionsInPeriodTotal} lượt nộp bài nghiệm thu trong tuần, phản ánh sự chủ động trong bàn giao sản phẩm.`,
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
      text: `Có ${metrics.progressUpdatesInPeriodTotal} cập nhật tiến độ được ghi nhận qua kênh trao đổi, toàn bộ công việc duy trì nhịp độ ổn định.`,
      sourceRefs: progressRefs.slice(0, 2),
      metricKeys: ["progressUpdatesInPeriodTotal"],
    });
  }

  if (summary.length === 0) {
    summary.push({
      text: "Kỳ xét duyệt ghi nhận trạng thái bình thường; các công việc đang được triển khai theo kế hoạch ban đầu.",
      sourceRefs: taskRefs.slice(0, 1),
      metricKeys: ["statusCounts"],
    });
  }

  return summary;
}

