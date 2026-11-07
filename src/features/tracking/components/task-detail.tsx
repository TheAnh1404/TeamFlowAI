"use client";

import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import { z } from "zod";
import type { Task, TaskStatus } from "@/contracts";
import { progressUpdateSchema, taskSchema } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes, routes } from "@/lib/routes";
import { loadContext, memberName, useRemoteData } from "./client-data";
import { displayTime, LoadNotice, ProjectNav } from "./shared";
import type { WorkspaceData } from "../model";
import { statusLabels } from "../model";
import styles from "./tracking.module.css";
import { DeliverySlot } from "@/features/delivery";

const symbols: Record<TaskStatus | "overdue", string> = {
  todo: "○",
  in_progress: "◷",
  blocked: "!",
  in_review: "◇",
  changes_requested: "↻",
  done: "✓",
  overdue: "!",
};

export function StatusBadge({ status }: { status: TaskStatus | "overdue" }) {
  return (
    <span className={styles.badge} data-status={status}>
      <span aria-hidden="true">{symbols[status]}</span>
      {status === "overdue" ? "Quá hạn" : statusLabels[status]}
    </span>
  );
}

export function TaskDetailPanel({ task, data, deliverySlot }: { task: Task; data: WorkspaceData; deliverySlot?: ReactNode }) {
  const owner = data.members.find((m) => m.member.id === task.assigneeMemberId)?.user.displayName ?? "Thành viên";
  const latest = data.updates.filter((u) => u.taskId === task.id).at(-1);
  return (
    <>
      <p className={styles.muted}>{task.id}</p>
      <h2 id="task-detail-title">{task.title}</h2>
      <div className={styles.line}>
        <StatusBadge status={task.status} />
        {task.status !== "done" && Date.parse(task.deadline) < Date.parse(data.asOf) && (
          <span className={`${styles.badge} ${styles.overdue}`}>Quá hạn</span>
        )}
      </div>
      <section aria-label="Thông tin công việc">
        <p className={styles.prewrap}>{task.description}</p>
        <p>Người phụ trách: <strong>{owner}</strong></p>
        <p>Hạn chót: {formatTime(task.deadline, data.project.timeZone)}</p>
        {task.dependencyTaskIds.length > 0 && (
          <p>
            Phụ thuộc: {task.dependencyTaskIds.map((id) => data.tasks.find((t) => t.id === id)?.title ?? id).join(", ")}.{" "}
            {task.dependencyTaskIds.some((id) => data.tasks.find((t) => t.id === id)?.status !== "done") && "Có công việc phụ thuộc chưa hoàn thành."}
          </p>
        )}
        {task.status === "blocked" && <p>Trở ngại: {latest?.blocker ?? "Chưa có mô tả trở ngại."}</p>}
      </section>
      <section>
        <h3>Tiêu chí nghiệm thu</h3>
        <ol className={styles.criteria}>
          {task.criteria.map((c) => (
            <li key={c.id}><small>{c.id}</small><br />{c.text}</li>
          ))}
        </ol>
      </section>
      {deliverySlot ?? (
        <section className={styles.notice}>
          <h3>Nộp bài & nhận xét</h3>
          <p>Phần nộp bài, review và nghiệm thu đang chờ module Delivery.</p>
        </section>
      )}
      <section>
        <h3>Lịch sử cập nhật</h3>
        {data.updates.filter((u) => u.taskId === task.id).length === 0 ? (
          <p className={styles.muted}>Chưa có cập nhật tiến độ.</p>
        ) : (
          data.updates.filter((u) => u.taskId === task.id).map((u) => (
            <div key={u.id} className={styles.notice}>
              <p><StatusBadge status={u.statusAfter} /> · {formatTime(u.createdAt, data.project.timeZone)}</p>
              <p className={styles.prewrap}>{u.note}</p>
              {u.blocker && <p>Trở ngại: {u.blocker}</p>}
            </div>
          ))
        )}
      </section>
    </>
  );
}

export function TaskDetail({ projectId, taskId, children }: { projectId: string; taskId: string; children?: ReactNode }) {
  const loader = useCallback(async () => {
    const [context, task, progress] = await Promise.all([
      loadContext(projectId),
      apiFetch(apiRoutes.tracking.task(taskId), taskSchema),
      apiFetch(apiRoutes.tracking.progressUpdates(taskId), z.array(progressUpdateSchema)),
    ]);
    if (task.data.projectId !== projectId) throw new Error("Công việc không thuộc dự án này.");
    return { context, task: task.data, progress: progress.data };
  }, [projectId, taskId]);
  const state = useRemoteData(loader);
  const data = state.data;
  return (
    <main className={styles.workspace}>
      <ProjectNav projectId={projectId} />
      <h1>{data?.task.title ?? "Chi tiết công việc"}</h1>
      <LoadNotice loading={state.loading} error={state.error} retry={state.reload} />
      {data && (
        <>
          <div className={styles.actions}>
            <StatusBadge status={data.task.status} />
            <button className={styles.button} onClick={state.reload}>Tải lại</button>
          </div>
          <p>{data.task.description}</p>
          <dl className={styles.details}>
            <dt>Người phụ trách</dt><dd>{memberName(data.task.assigneeMemberId, data.context.members, data.context.users)}</dd>
            <dt>Hạn chót</dt><dd>{displayTime(data.task.deadline, data.context.project.timeZone)}</dd>
            <dt>Thời điểm nghiệm thu</dt><dd>{data.task.acceptedAt ? displayTime(data.task.acceptedAt, data.context.project.timeZone) : "Chưa nghiệm thu"}</dd>
            <dt>Phụ thuộc</dt><dd>{data.task.dependencyTaskIds.length ? data.task.dependencyTaskIds.map(id => <div key={id}><Link href={routes.task(projectId, id)}>{id}</Link></div>) : "Không có"}</dd>
          </dl>
          <section className={styles.section}><h2>Tiêu chí nghiệm thu</h2><ul>{data.task.criteria.map(criterion => <li key={criterion.id}>{criterion.text} <span className={styles.meta}>({criterion.id})</span></li>)}</ul></section>
          <section className={styles.section}><h2>Lịch sử cập nhật</h2>{!data.progress.length ? <p>Chưa có cập nhật tiến độ được ghi nhận.</p> : <ol>{data.progress.map(update => <li key={update.id}><p><strong>{memberName(update.authorMemberId, data.context.members, data.context.users)}</strong> · {displayTime(update.createdAt, data.context.project.timeZone)} · {statusLabels[update.statusBefore]} → {statusLabels[update.statusAfter]}</p><p>{update.note}</p>{update.blocker && <p>Trở ngại: {update.blocker}</p>}</li>)}</ol>}</section>
          <section className={styles.section} aria-label="Nộp bài và review">{children ?? <DeliverySlot task={data.task} currentMember={data.context.members.find(member => member.userId === data.context.session.user.id)} onTaskChange={state.reload} />}</section>
        </>
      )}
    </main>
  );
}

export function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone }).format(new Date(value));
}
