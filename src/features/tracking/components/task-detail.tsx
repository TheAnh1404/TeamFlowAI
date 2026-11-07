"use client";
import type { ReactNode } from "react";
import type { Task, TaskStatus } from "@/contracts";
import type { WorkspaceData } from "../model";
import { statusLabels } from "../model";
import styles from "./tracking.module.css";

const symbols: Record<TaskStatus, string> = { todo: "○", in_progress: "◷", blocked: "!", in_review: "◇", changes_requested: "↻", done: "✓" };
export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={styles.badge} data-status={status}><span aria-hidden="true">{symbols[status]}</span>{statusLabels[status]}</span>;
}
export function TaskDetailPanel({ task, data, deliverySlot }: { task: Task; data: WorkspaceData; deliverySlot?: ReactNode }) {
  const owner = data.members.find((m) => m.member.id === task.assigneeMemberId)?.user.displayName ?? "Thành viên";
  const latest = data.updates.filter((u) => u.taskId === task.id).at(-1);
  return <>
    <p className={styles.muted}>{task.id}</p><h2 id="task-detail-title">{task.title}</h2>
    <div className={styles.line}><StatusBadge status={task.status} />{task.status !== "done" && Date.parse(task.deadline) < Date.parse(data.asOf) && <span className={`${styles.badge} ${styles.overdue}`}>Quá hạn</span>}</div>
    <section aria-label="Thông tin công việc"><p className={styles.prewrap}>{task.description}</p><p>Người phụ trách: <strong>{owner}</strong></p><p>Hạn chót: {formatTime(task.deadline, data.project.timeZone)}</p>
      {task.dependencyTaskIds.length > 0 && <p>Phụ thuộc: {task.dependencyTaskIds.map((id) => data.tasks.find((t) => t.id === id)?.title ?? id).join(", ")}. {task.dependencyTaskIds.some((id) => data.tasks.find((t) => t.id === id)?.status !== "done") && "Có công việc phụ thuộc chưa hoàn thành."}</p>}
      {task.status === "blocked" && <p>Trở ngại: {latest?.blocker ?? "Chưa có mô tả trở ngại."}</p>}
    </section>
    <section><h3>Tiêu chí nghiệm thu</h3><ol className={styles.criteria}>{task.criteria.map((c) => <li key={c.id}><small>{c.id}</small><br />{c.text}</li>)}</ol></section>
    {deliverySlot ?? <section className={styles.notice}><h3>Nộp bài & nhận xét</h3><p>Phần nộp bài, review và nghiệm thu đang chờ module Delivery.</p></section>}
    <section><h3>Lịch sử cập nhật</h3>{data.updates.filter((u) => u.taskId === task.id).length === 0 ? <p className={styles.muted}>Chưa có cập nhật tiến độ.</p> : data.updates.filter((u) => u.taskId === task.id).map((u) => <div key={u.id} className={styles.notice}><p><StatusBadge status={u.statusAfter} /> · {formatTime(u.createdAt, data.project.timeZone)}</p><p className={styles.prewrap}>{u.note}</p>{u.blocker && <p>Trở ngại: {u.blocker}</p>}</div>)}</section>
  </>;
}
export function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone }).format(new Date(value));
}
