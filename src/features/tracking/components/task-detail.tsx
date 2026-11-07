"use client";

import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import { z } from "zod";
import { progressUpdateSchema, taskSchema } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes, routes } from "@/lib/routes";
import { loadContext, memberName, useRemoteData } from "./client-data";
import { displayTime, LoadNotice, ProjectNav, StatusBadge, statusLabels } from "./shared";
import styles from "./tracking.module.css";

export function TaskDetail({ projectId, taskId, children }: { projectId: string; taskId: string; children?: ReactNode }) {
  const loader = useCallback(async () => {
    const [context, task, progress] = await Promise.all([
      loadContext(projectId), apiFetch(apiRoutes.tracking.task(taskId), taskSchema),
      apiFetch(apiRoutes.tracking.progressUpdates(taskId), z.array(progressUpdateSchema)),
    ]);
    if (task.data.projectId !== projectId) throw new Error("Công việc không thuộc dự án này.");
    return { context, task: task.data, progress: progress.data };
  }, [projectId, taskId]);
  const state = useRemoteData(loader);
  const data = state.data;
  return <main className={styles.workspace}>
    <ProjectNav projectId={projectId} /><h1>{data?.task.title ?? "Chi tiết công việc"}</h1>
    <LoadNotice loading={state.loading} error={state.error} retry={state.reload} />
    {data && <>
      <div className={styles.actions}><StatusBadge status={data.task.status} /><button className={styles.button} onClick={state.reload}>Tải lại</button></div>
      <p>{data.task.description}</p>
      <dl className={styles.details}>
        <dt>Người phụ trách</dt><dd>{memberName(data.task.assigneeMemberId, data.context.members, data.context.users)}</dd>
        <dt>Hạn chót</dt><dd>{displayTime(data.task.deadline, data.context.project.timeZone)}</dd>
        <dt>Thời điểm nghiệm thu</dt><dd>{data.task.acceptedAt ? displayTime(data.task.acceptedAt, data.context.project.timeZone) : "Chưa nghiệm thu"}</dd>
        <dt>Phụ thuộc</dt><dd>{data.task.dependencyTaskIds.length ? data.task.dependencyTaskIds.map(id => <div key={id}><Link href={routes.task(projectId, id)}>{id}</Link></div>) : "Không có"}</dd>
      </dl>
      <section className={styles.section}><h2>Tiêu chí nghiệm thu</h2><ul>{data.task.criteria.map(criterion => <li key={criterion.id}>{criterion.text} <span className={styles.meta}>({criterion.id})</span></li>)}</ul></section>
      <section className={styles.section}><h2>Lịch sử cập nhật</h2>{!data.progress.length ? <p>Chưa có cập nhật tiến độ được ghi nhận.</p> : <ol>{data.progress.map(update => <li key={update.id}><p><strong>{memberName(update.authorMemberId, data.context.members, data.context.users)}</strong> · {displayTime(update.createdAt, data.context.project.timeZone)} · {statusLabels[update.statusBefore]} → {statusLabels[update.statusAfter]}</p><p>{update.note}</p>{update.blocker && <p>Trở ngại: {update.blocker}</p>}</li>)}</ol>}</section>
      <section className={styles.section} aria-label="Nộp bài và review">{children ?? <p className={styles.notice}>Khu vực nộp bài và nhận xét chưa được triển khai.</p>}</section>
    </>}
  </main>;
}
