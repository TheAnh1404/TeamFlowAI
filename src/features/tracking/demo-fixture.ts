import type {
  Project,
  ProjectMember,
  Task,
  Message,
  ProgressUpdate,
  User,
  Plan,
} from "@/contracts";
import type { WeeklyReport } from "@/contracts/report";
import type { WorkspaceData } from "./model";

export const DEMO_PROJECT_ID = "demo-event-website";

export const demoProject: Project = {
  id: DEMO_PROJECT_ID,
  name: "Website đăng ký sự kiện DevDay Da Nang",
  goal: "Xây dựng cổng đăng ký và xác thực vé tham dự cho 500 khách mời tại DevDay Community Da Nang.",
  deliverables: [
    "Giao diện trang chủ và biểu mẫu đăng ký vé",
    "API sinh mã QR vé và gửi email xác nhận tự động",
    "Ứng dụng quét mã QR check-in tại quầy sự kiện",
    "Bảng điều khiển quản trị thống kê lượng khách check-in",
  ],
  deadline: "2026-11-20T17:00:00.000Z",
  timeZone: "Asia/Ho_Chi_Minh",
  createdAt: "2026-11-01T08:00:00.000Z",
};

export const demoUsers: User[] = [
  { id: "user-tv1", displayName: "Hoàng Anh (Trưởng nhóm)", createdAt: "2026-11-01T08:00:00.000Z" },
  { id: "user-tv2", displayName: "Quốc Bảo (Frontend)", createdAt: "2026-11-01T08:00:00.000Z" },
  { id: "user-tv3", displayName: "Minh Trí (Backend & AI)", createdAt: "2026-11-01T08:00:00.000Z" },
];

export const demoMembers: { member: ProjectMember; user: User }[] = [
  {
    member: {
      id: "member-tv1",
      projectId: DEMO_PROJECT_ID,
      userId: "user-tv1",
      role: "leader",
      canAccept: true,
      skills: ["Quản lý dự án", "Next.js", "Kiến trúc hệ thống"],
      availableHoursPerWeek: 20,
    },
    user: demoUsers[0],
  },
  {
    member: {
      id: "member-tv2",
      projectId: DEMO_PROJECT_ID,
      userId: "user-tv2",
      role: "member",
      canAccept: false,
      skills: ["React 19", "Tailwind CSS", "UI/UX", "Mobile Responsive"],
      availableHoursPerWeek: 25,
    },
    user: demoUsers[1],
  },
  {
    member: {
      id: "member-tv3",
      projectId: DEMO_PROJECT_ID,
      userId: "user-tv3",
      role: "member",
      canAccept: false,
      skills: ["Node.js", "PostgreSQL", "Drizzle ORM", "Argon2"],
      availableHoursPerWeek: 25,
    },
    user: demoUsers[2],
  },
];

export const demoTasks: Task[] = [
  {
    id: "task-demo-1",
    projectId: DEMO_PROJECT_ID,
    planId: "plan-demo",
    title: "Thiết kế Landing Page và Form đăng ký",
    description: "Xây dựng trang đích giới thiệu sự kiện, diễn giả, lịch trình và biểu mẫu thu thập thông tin khách mời.",
    assigneeMemberId: "member-tv2",
    deadline: "2026-11-15T17:00:00.000Z",
    criteria: [
      { id: "CRIT-01", text: "Giao diện tương thích hoàn hảo trên mobile 375px và desktop 1440px" },
      { id: "CRIT-02", text: "Form xác thực email và số điện thoại theo chuẩn quốc tế" },
    ],
    dependencyTaskIds: [],
    status: "in_review",
    version: 2,
    acceptedSubmissionId: null,
    acceptedByMemberId: null,
    acceptedAt: null,
    createdAt: "2026-11-02T08:00:00.000Z",
  },
  {
    id: "task-demo-2",
    projectId: DEMO_PROJECT_ID,
    planId: "plan-demo",
    title: "Xây dựng API sinh mã QR và gửi email",
    description: "Endpoint tiếp nhận đăng ký, mã hóa dữ liệu vé thành mã QR và gửi email xác nhận cho khách.",
    assigneeMemberId: "member-tv3",
    deadline: "2026-11-16T17:00:00.000Z",
    criteria: [
      { id: "CRIT-03", text: "Sinh mã QR chứa chữ ký bảo mật không thể giả mạo" },
      { id: "CRIT-04", text: "Thời gian gửi email không vượt quá 5 giây sau khi đăng ký" },
    ],
    dependencyTaskIds: ["task-demo-1"],
    status: "blocked",
    version: 3,
    acceptedSubmissionId: null,
    acceptedByMemberId: null,
    acceptedAt: null,
    createdAt: "2026-11-02T08:00:00.000Z",
  },
  {
    id: "task-demo-3",
    projectId: DEMO_PROJECT_ID,
    planId: "plan-demo",
    title: "Tích hợp module quét vé check-in tại cổng",
    description: "Màn hình camera trên thiết bị di động quét mã QR vé và xác thực lượt vào cổng.",
    assigneeMemberId: "member-tv2",
    deadline: "2026-11-18T17:00:00.000Z",
    criteria: [
      { id: "CRIT-05", text: "Quét mã QR dưới 1 giây và hiển thị trạng thái hợp lệ/đã dùng" },
    ],
    dependencyTaskIds: ["task-demo-2"],
    status: "in_progress",
    version: 1,
    acceptedSubmissionId: null,
    acceptedByMemberId: null,
    acceptedAt: null,
    createdAt: "2026-11-02T08:00:00.000Z",
  },
  {
    id: "task-demo-4",
    projectId: DEMO_PROJECT_ID,
    planId: "plan-demo",
    title: "Dashboard quản trị thống kê khách mời",
    description: "Bảng điều khiển hiển thị tổng số lượng đăng ký, số khách đã check-in và biểu đồ theo khung giờ.",
    assigneeMemberId: "member-tv3",
    deadline: "2026-11-19T17:00:00.000Z",
    criteria: [
      { id: "CRIT-06", text: "Cập nhật dữ liệu thời gian thực theo từng lượt quét vé tại cổng" },
    ],
    dependencyTaskIds: ["task-demo-3"],
    status: "todo",
    version: 1,
    acceptedSubmissionId: null,
    acceptedByMemberId: null,
    acceptedAt: null,
    createdAt: "2026-11-02T08:00:00.000Z",
  },
  {
    id: "task-demo-5",
    projectId: DEMO_PROJECT_ID,
    planId: "plan-demo",
    title: "Thiết lập hạ tầng máy chủ và bảo mật",
    description: "Cấu hình môi trường Neon PostgreSQL, xác thực session và kiểm thử khả năng chịu tải.",
    assigneeMemberId: "member-tv1",
    deadline: "2026-11-14T17:00:00.000Z",
    criteria: [
      { id: "CRIT-07", text: "Vượt qua kiểm thử 500 yêu cầu đồng thời không phát sinh lỗi 500" },
    ],
    dependencyTaskIds: [],
    status: "done",
    version: 2,
    acceptedSubmissionId: "sub-done-1",
    acceptedByMemberId: "member-tv1",
    acceptedAt: "2026-11-06T15:00:00.000Z",
    createdAt: "2026-11-02T08:00:00.000Z",
  },
];

export const demoUpdates: ProgressUpdate[] = [
  {
    id: "update-1",
    projectId: DEMO_PROJECT_ID,
    taskId: "task-demo-1",
    messageId: "msg-1",
    authorMemberId: "member-tv2",
    statusBefore: "in_progress",
    statusAfter: "in_review",
    note: "Đã hoàn thành thiết kế giao diện Landing Page và nộp bài để nghiệm thu.",
    blocker: null,
    createdAt: "2026-11-06T10:00:00.000Z",
  },
  {
    id: "update-2",
    projectId: DEMO_PROJECT_ID,
    taskId: "task-demo-2",
    messageId: "msg-2",
    authorMemberId: "member-tv3",
    statusBefore: "in_progress",
    statusAfter: "blocked",
    note: "Cổng gửi thư SMTP gặp lỗi giới hạn tần suất (Rate limit 429) từ nhà cung cấp dịch vụ email.",
    blocker: "Cổng gửi thư SMTP gặp lỗi giới hạn tần suất (Rate limit 429) từ nhà cung cấp dịch vụ email.",
    createdAt: "2026-11-06T14:30:00.000Z",
  },
];

export const demoMessages: Message[] = [
  {
    id: "msg-welcome",
    projectId: DEMO_PROJECT_ID,
    authorMemberId: "member-tv1",
    content: "Chào cả nhóm! Dự án Website đăng ký sự kiện đã công bố kế hoạch. Mọi người theo dõi task của mình nhé.",
    taskId: null,
    candidateTaskIds: [],
    resolution: "no_change",
    clarificationQuestion: null,
    aiMode: "real",
    createdAt: "2026-11-05T08:30:00.000Z",
  },
  {
    id: "msg-1",
    projectId: DEMO_PROJECT_ID,
    authorMemberId: "member-tv2",
    content: "Tôi đã xong giao diện Landing Page và nộp bài để trưởng nhóm review.",
    taskId: "task-demo-1",
    candidateTaskIds: [],
    resolution: "applied",
    clarificationQuestion: null,
    aiMode: "real",
    createdAt: "2026-11-06T10:00:00.000Z",
  },
  {
    id: "msg-2",
    projectId: DEMO_PROJECT_ID,
    authorMemberId: "member-tv3",
    content: "Module gửi mã QR qua email đang bị nghẽn do giới hạn rate limit SMTP của nhà mạng.",
    taskId: "task-demo-2",
    candidateTaskIds: [],
    resolution: "applied",
    clarificationQuestion: null,
    aiMode: "real",
    createdAt: "2026-11-06T14:30:00.000Z",
  },
];

export const demoPlan: Plan = {
  id: "plan-demo",
  projectId: DEMO_PROJECT_ID,
  status: "published",
  version: 1,
  draftTasks: demoTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    assigneeMemberId: t.assigneeMemberId,
    deadline: t.deadline,
    criteria: t.criteria,
    dependencyTaskIds: t.dependencyTaskIds,
  })),
  aiMode: "real",
  approvedByMemberId: "member-tv1",
  publishedAt: "2026-11-02T08:30:00.000Z",
  createdAt: "2026-11-02T08:00:00.000Z",
};

export const demoWeeklyReports: WeeklyReport[] = [
  {
    id: "report-demo-1",
    projectId: DEMO_PROJECT_ID,
    generatedByMemberId: "member-tv1",
    periodStart: "2026-11-01T00:00:00.000Z",
    periodEnd: "2026-11-07T17:00:00.000Z",
    asOf: "2026-11-07T17:00:00.000Z",
    metrics: {
      dueInPeriodTotal: 3,
      submittedOnTimeTotal: 2,
      acceptedOnTimeTotal: 1,
      overdueOpenTotal: 0,
      submissionsInPeriodTotal: 1,
      progressUpdatesInPeriodTotal: 2,
      statusCounts: {
        todo: 1,
        in_progress: 1,
        blocked: 1,
        in_review: 1,
        changes_requested: 0,
        done: 1,
      },
    },
    sourceRefs: [
      { entity: "Task", id: "task-demo-1" },
      { entity: "Task", id: "task-demo-2" },
      { entity: "Message", id: "msg-2" },
    ],
    summary: [
      {
        text: "Dự án đã hoàn thành thiết lập hạ tầng máy chủ và bảo mật đúng hạn; giao diện Landing Page đã được nộp bài và đang chờ nghiệm thu.",
        sourceRefs: [{ entity: "Task", id: "task-demo-1" }],
        metricKeys: ["acceptedOnTimeTotal", "submittedOnTimeTotal"],
      },
      {
        text: "Trở ngại chính trong tuần: Module gửi mã QR qua email đang bị chặn do giới hạn rate limit SMTP từ nhà cung cấp dịch vụ, cần chuyển sang dịch vụ SendGrid hoặc SES.",
        sourceRefs: [
          { entity: "Task", id: "task-demo-2" },
          { entity: "Message", id: "msg-2" },
        ],
        metricKeys: ["overdueOpenTotal"],
      },
    ],
    aiMode: "real",
    createdAt: "2026-11-07T17:05:00.000Z",
  },
];

export function getDemoWorkspaceData(): WorkspaceData {
  return {
    asOf: new Date().toISOString(),
    project: demoProject,
    actor: demoMembers[0].member, // Hoàng Anh (Leader)
    members: demoMembers,
    tasks: demoTasks,
    messages: demoMessages,
    updates: demoUpdates,
  };
}
