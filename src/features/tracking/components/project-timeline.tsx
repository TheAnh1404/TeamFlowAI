"use client";
import { useEffect, useState } from "react";
import type { WorkspaceData } from "../model";
import { formatTime, statusLabels } from "../model";
import { projectSupervision } from "../supervision";
import styles from "./tracking.module.css";

export function ProjectTimeline({data}: {data: Pick<WorkspaceData,"asOf"|"project"|"tasks"|"members">}) {
  const [asOf, setAsOf] = useState(data.asOf);
  useEffect(() => {
    const timer = setInterval(() => setAsOf(new Date().toISOString()), 30000);
    return () => clearInterval(timer);
  }, []);
  const summary = projectSupervision(data.project, data.tasks, asOf);
  const userName = (id: string) => data.members.find(m => m.member.id === id)?.user.displayName ?? "Thành viên";
  return <section className={styles.timeline} aria-labelledby="timeline-title" data-testid="project-timeline">
    <div className={styles.header}><div><p className={styles.eyebrow}>THEO DÕI KẾ HOẠCH</p><h2 id="timeline-title">Timeline & tiến độ dự án</h2></div><strong>Hạn dự án: {formatTime(data.project.deadline, data.project.timeZone)}</strong></div>
    <div className={styles.progressHeader}><strong>{summary.progressPercent === null ? "Chưa có công việc được công bố" : `${summary.progressPercent}% đã nghiệm thu`}</strong><span>{summary.accepted} / {summary.total} công việc</span></div>
    {summary.total > 0 && <progress className={styles.progress} max={summary.total} value={summary.accepted} aria-label="Tiến độ công việc đã nghiệm thu" />}
    <p className={styles.muted}>Chỉ tính công việc được người có quyền xác nhận hoàn thành. Đang làm và chờ review được hiển thị riêng.</p>
    <div className={styles.line}><span>Đã sử dụng {summary.elapsedPercent}% thời gian</span><span>· {summary.awaitingAcceptance} chờ nghiệm thu</span><span>· {summary.blocked} bị chặn</span></div>
    {summary.deadlineRisk && <div role="status" className={`${styles.notice} ${styles.risk}`}><strong>{summary.overdue ? "Dự án đã quá hạn" : "Cần chú ý trước deadline"}</strong><p>Đã sử dụng ít nhất 80% thời gian, hiện {summary.progressPercent}% công việc được nghiệm thu. Trưởng nhóm cần rà soát trở ngại, các bài chờ nghiệm thu và thống nhất hành động với nhóm.</p></div>}
    {summary.timeline.length > 0 && <details><summary>Xem mốc công việc theo hạn chót ({summary.total})</summary><ol className={styles.timelineItems}>{summary.timeline.map(t => <li key={t.taskId}><div><strong>{t.title}</strong><p>{userName(t.assigneeMemberId)} · {statusLabels[t.status]}{t.dependenciesPending.length > 0 ? ` · ${t.dependenciesPending.length} phụ thuộc chưa hoàn thành` : ""}</p></div><span className={t.overdue ? styles.overdue : undefined}>{formatTime(t.deadline, data.project.timeZone)}{t.overdue ? " · Quá hạn" : ""}</span></li>)}</ol></details>}
    <p className={styles.muted}>Mốc rà soát 80% thời gian: {formatTime(summary.reminderAt, data.project.timeZone)}</p>
  </section>;
}
