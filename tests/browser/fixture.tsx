import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { TrackingWorkbench } from "../../src/features/tracking/components/workbench";
import type { WorkspaceData } from "../../src/features/tracking/model";
import styles from "../../src/features/tracking/components/tracking.module.css";

const now = "2026-11-07T03:00:00.000Z";
const members: WorkspaceData["members"] = [1, 2, 3].map((i) => ({ user: { id: `u${i}`, displayName: `TV${i}`, createdAt: now }, member: { id: `m${i}`, userId: `u${i}`, projectId: "p1", role: i === 1 ? "leader" : "member", canAccept: i !== 2, skills: [], availableHoursPerWeek: 10 } }));
const data: WorkspaceData = {
  asOf: now, project: { id: "p1", name: "TeamFlow — Dữ liệu kiểm thử", goal: "Test only", deliverables: ["demo"], deadline: "2026-11-14T10:00:00.000Z", timeZone: "Asia/Ho_Chi_Minh", createdAt: now },
  members, actor: members[1].member,
  tasks: [1, 2, 3].map((i) => ({ id: `t${i}`, projectId: "p1", planId: "plan1", title: ["API tracking", "Giao diện dự án", "Báo cáo tuần"][i - 1], description: "Nội dung công việc kiểm thử. <script>window.xss = true</script>", assigneeMemberId: `m${i === 1 ? 2 : i === 2 ? 1 : 3}`, criteria: [{ id: `c${i}`, text: "Có hướng dẫn sử dụng" }], dependencyTaskIds: [], deadline: i === 1 ? "2026-11-06T10:00:00.000Z" : "2026-11-14T10:00:00.000Z", status: i === 1 ? "blocked" : "todo", version: 1, acceptedAt: null, acceptedByMemberId: null, acceptedSubmissionId: null, createdAt: now })),
  messages: [{ id: "msg1", projectId: "p1", authorMemberId: "m2", content: "phần đó bị chặn <img src=x onerror=alert(1)>", taskId: null, candidateTaskIds: ["t1"], resolution: "clarification_required", clarificationQuestion: "Bạn đang nói đến công việc nào?", aiMode: "mock", createdAt: now }], updates: [],
};
const router = {
  bfcacheId: "test-fixture",
  back() {}, forward() {}, prefetch: async () => {},
  push: (url: string) => { document.body.dataset.navigation = url; },
  replace: (url: string) => { document.body.dataset.navigation = url; },
  refresh: () => { document.body.dataset.refreshed = "true"; },
};
function Fixture() {
  const [screen, setScreen] = useState<"board" | "chat" | "task">("board");
  return <AppRouterContext.Provider value={router}><div className={styles.workspace}>
    <h1>{data.project.name}</h1><p>Giao diện kiểm thử độc lập — không phải dữ liệu Neon.</p>
    <div className={styles.tabs}><button onClick={() => setScreen("board")}>Bảng task</button><button onClick={() => setScreen("chat")}>Chat kiểm thử</button><button onClick={() => setScreen("task")}>Task trực tiếp</button></div>
    <TrackingWorkbench data={data} screen={screen} taskId="t1" renderDelivery={({ onDirtyChange }) => <label>Bài nộp kiểm thử<textarea onChange={(e) => onDirtyChange(!!e.target.value)} /></label>} />
  </div></AppRouterContext.Provider>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
