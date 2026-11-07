"use client";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Task } from "@/contracts";
import { routes } from "@/lib/routes";
import { DeliverySlot } from "@/features/delivery";
import { statusLabels, type WorkspaceData } from "../model";
import { StatusBadge, TaskDetailPanel, formatTime } from "./task-detail";
import { ChatPanel } from "./chat-panel";
import { ProjectTimeline } from "./project-timeline";
import { MemberManager } from "./member-manager";
import styles from "./tracking.module.css";

export interface DeliverySlotProps {
  task: Task; currentMember: WorkspaceData["actor"];
  onTaskChange: () => void; onDirtyChange: (dirty: boolean) => void;
}
export interface WorkbenchProps {
  data: WorkspaceData; screen: "board" | "chat" | "task"; taskId?: string;
  renderDelivery?: (props: DeliverySlotProps) => ReactNode;
}
const subscribeToDesktop = (changed: () => void) => {
  const media = window.matchMedia("(min-width: 768px)"); media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
};
export function TrackingWorkbench({ data, screen, taskId, renderDelivery }: WorkbenchProps) {
  const router = useRouter();
  const [refreshing,startRefresh]=useTransition();
  const desktop = useSyncExternalStore(subscribeToDesktop, () => window.matchMedia("(min-width: 768px)").matches, () => false);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [owner, setOwner] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null); const dialog = useRef<HTMLDialogElement>(null);
  const [isDirty, setDirty] = useState(false); const opener = useRef<HTMLElement | null>(null);
  const [hasMutated, setHasMutated] = useState(false);
  const selected = data.tasks.find((t) => t.id === (screen === "task" ? taskId : selectedId));
  useEffect(() => {
    if ((selectedId || (screen === "task" && desktop)) && dialog.current && !dialog.current.open) {
      dialog.current.showModal(); dialog.current.querySelector("button")?.focus();
    }
  }, [selectedId, screen, desktop]);
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
    const first = targets[0], last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  function close() {
    if(refreshing)return;
    if (isDirty && !window.confirm("Bài nộp đang soạn chưa được lưu. Bạn muốn đóng và bỏ nội dung đang soạn?")) return;
    setDirty(false); dialog.current?.close(); setSelectedId(null);
    const destination = screen === "chat" ? routes.chat(data.project.id) : routes.tasks(data.project.id);
    // A saved mutation may have refreshed the task URL behind the drawer.
    // Finish that navigation with a fresh document, cancelling any late RSC
    // stream, and return keyboard focus to the task's row via its fragment.
    if (hasMutated || screen === "task") {
      window.location.assign(destination + (screen !== "chat" && selected ? `#task-${selected.id}` : ""));
      return;
    }
    router.push(destination);
    opener.current?.focus();
  }
  function open(task: Task, origin: HTMLElement) {
    if (window.matchMedia("(max-width: 767px)").matches) { router.push(routes.task(data.project.id, task.id)); return; }
    opener.current = origin; setSelectedId(task.id);
    window.history.replaceState(null, "", routes.task(data.project.id, task.id));
  }
  const filtered = data.tasks.filter((t) => t.title.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (!status || t.status === status) && (!owner || t.assigneeMemberId === owner));
  const overdue = (t: Task) => t.status !== "done" && Date.parse(t.deadline) < Date.parse(data.asOf);
  const detail = selected && <TaskDetailPanel task={selected} data={data} deliverySlot={renderDelivery?.({ task: selected, currentMember: data.actor, onTaskChange: () => { setHasMutated(true); startRefresh(() => router.refresh()); }, onDirtyChange: setDirty }) ?? <DeliverySlot task={selected} currentMember={data.actor} onTaskChange={() => router.refresh()} onDirtyChange={setDirty} />} />;
  return <>
    {(screen === "board" || (screen === "task" && desktop)) && <>
      <ProjectTimeline data={data} />
      {screen === "board" && <MemberManager data={data} onChanged={() => router.refresh()} />}
      <div className={styles.metrics} aria-label="Tóm tắt công việc">{[
        ["Đã hoàn thành", `${data.tasks.filter((t) => t.status === "done").length} / ${data.tasks.length}`],
        ["Bị chặn", data.tasks.filter((t) => t.status === "blocked").length],
        ["Quá hạn", data.tasks.filter(overdue).length],
        ["Chờ nghiệm thu", data.tasks.filter((t) => t.status === "in_review").length],
      ].map(([label, value]) => <div className={styles.metric} key={label}><span className={styles.muted}>{label}</span><strong>{value}</strong></div>)}</div>
      {data.tasks.length === 0 ? <div className={styles.empty}><h2>Chưa có công việc được công bố</h2><p>{data.actor.role === "leader" ? "Duyệt và công bố kế hoạch để nhóm bắt đầu làm việc." : "Kế hoạch đang được trưởng nhóm hoàn thiện."}</p>{data.actor.role === "leader" && <Link href={routes.plan(data.project.id)}>Chuyển đến Kế hoạch để duyệt</Link>}</div> : <>
        <div className={styles.toolbar}>
          <label>Tìm công việc<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên công việc…" /></label>
          <button type="button" aria-pressed={owner === data.actor.id} onClick={() => setOwner(owner === data.actor.id ? "" : data.actor.id)}>Việc của tôi</button>
          <label>Trạng thái<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Người phụ trách<select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Tất cả</option>{data.members.map(({ member, user }) => <option key={member.id} value={member.id}>{user.displayName}</option>)}</select></label>
          {(search || status || owner) && <button type="button" onClick={() => { setSearch(""); setStatus(""); setOwner(""); }}>Xóa bộ lọc</button>}
        </div>
        <p className={styles.muted} aria-live="polite">{filtered.length} công việc</p>
        {filtered.length === 0 ? <div className={styles.empty}>Không có công việc khớp bộ lọc.</div> : <table className={styles.table}><thead><tr><th>Công việc</th><th>Người phụ trách</th><th>Trạng thái</th><th>Hạn chót</th><th>Trở ngại / Phụ thuộc</th><th>Cập nhật gần nhất</th></tr></thead><tbody>{filtered.map((task) => {
          const latest = data.updates.filter((u) => u.taskId === task.id).at(-1);
          return <tr key={task.id} className={styles.row} onClick={(e) => { const link = e.currentTarget.querySelector("a"); if (link && !(e.target as HTMLElement).closest("a")) open(task, link); }}>
            <td><Link id={`task-${task.id}`} href={routes.task(data.project.id, task.id)} onClick={(e) => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); open(task, e.currentTarget); } }}>{task.title}</Link><br /><small className={styles.muted}>{task.id}</small></td>
            <td>{data.members.find((m) => m.member.id === task.assigneeMemberId)?.user.displayName ?? "Thành viên"}</td>
            <td><StatusBadge status={task.status} /></td><td>{formatTime(task.deadline, data.project.timeZone)}{overdue(task) && <><br /><span className={`${styles.badge} ${styles.overdue}`}>Quá hạn</span></>}</td>
            <td>{task.status === "blocked" ? latest?.blocker ?? "Chưa có mô tả" : task.dependencyTaskIds.length ? `${task.dependencyTaskIds.length} phụ thuộc` : "—"}</td>
            <td>{latest ? formatTime(latest.createdAt, data.project.timeZone) : "Chưa có cập nhật"}</td>
          </tr>;
        })}</tbody></table>}
      </>}
    </>}
    {screen === "chat" && <ChatPanel data={data} onOpenTask={open} />}
    {screen === "task" && !desktop && <div className={styles.taskPage}><Link href={routes.tasks(data.project.id)} onClick={(e) => { if (isDirty && !window.confirm("Bỏ nội dung bài nộp đang soạn?")) e.preventDefault(); }}>← Quay lại danh sách</Link>{detail ?? <p role="alert">Không tìm thấy công việc trong dự án này.</p>}</div>}
    {(screen !== "task" || desktop) && <dialog ref={dialog} className={styles.dialog} aria-labelledby="task-detail-title" onKeyDown={trapFocus} onCancel={(e) => { e.preventDefault(); close(); }}>
      <button type="button" disabled={refreshing} onClick={close} aria-label="Đóng chi tiết công việc">Đóng ×</button>{refreshing&&<p role="status">Đang đồng bộ dữ liệu công việc…</p>}{detail}
    </dialog>}
  </>;
}
