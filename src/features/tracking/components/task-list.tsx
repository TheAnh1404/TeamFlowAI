"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { z } from "zod";
import { taskListItemSchema, taskStatusSchema } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes, routes } from "@/lib/routes";
import { loadContext, memberName, useRemoteData } from "./client-data";
import { displayTime, LoadNotice, ProjectNav, StatusBadge, statusLabels } from "./shared";
import styles from "./tracking.module.css";

export function TaskList({ projectId, initialSearch = "", initialStatus = "", initialAssignee = "" }: { projectId: string; initialSearch?: string; initialStatus?: string; initialAssignee?: string }) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [assignee, setAssignee] = useState(initialAssignee);
  const loader = useCallback(async () => {
    const [context, tasks] = await Promise.all([loadContext(projectId), apiFetch(apiRoutes.tracking.tasks(projectId), z.array(taskListItemSchema))]);
    return { context, tasks: tasks.data, loadedAt: Date.now() };
  }, [projectId]);
  const state = useRemoteData(loader);
  function filter(nextSearch: string, nextStatus: string, nextAssignee: string) {
    setSearch(nextSearch); setStatus(nextStatus); setAssignee(nextAssignee);
    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextStatus) params.set("status", nextStatus);
    if (nextAssignee) params.set("assignee", nextAssignee);
    window.history.replaceState(null, "", routes.tasks(projectId) + (params.size ? "?" + params.toString() : ""));
  }
  const data = state.data;
  const currentMember = data?.context.session.memberships.find(member => member.projectId === projectId);
  const visible = data?.tasks.filter(task => task.title.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (!status || task.status === status) && (!assignee || task.assigneeMemberId === assignee)) ?? [];
  const overdue = (deadline: string, taskStatus: string) => taskStatus !== "done" && Date.parse(deadline) < (data?.loadedAt ?? 0);
  return <main className={styles.workspace}>
    <ProjectNav projectId={projectId} /><h1>{data?.context.project.name ?? "Công việc"}</h1>
    {data && <p className={styles.meta}>Hạn dự án: {displayTime(data.context.project.deadline, data.context.project.timeZone)} · Múi giờ: {data.context.project.timeZone}</p>}
    <LoadNotice loading={state.loading} error={state.error} retry={state.reload} />
    {data && <>
      <dl className={styles.metrics}>
        <div><dt>Đã nghiệm thu</dt><dd>{data.tasks.filter(task => task.status === "done").length}/{data.tasks.length}</dd></div>
        <div><dt>Bị chặn</dt><dd>{data.tasks.filter(task => task.status === "blocked").length}</dd></div>
        <div><dt>Quá hạn</dt><dd>{data.tasks.filter(task => overdue(task.deadline, task.status)).length}</dd></div>
        <div><dt>Chờ nghiệm thu</dt><dd>{data.tasks.filter(task => task.status === "in_review").length}</dd></div>
      </dl>
      <div className={styles.toolbar}>
        <div className={styles.field}><label htmlFor="task-search">Tìm công việc</label><input className={styles.input} id="task-search" value={search} onChange={event => filter(event.target.value, status, assignee)} /></div>
        <div className={styles.field}><label htmlFor="task-status">Trạng thái</label><select className={styles.select} id="task-status" value={status} onChange={event => filter(search, event.target.value, assignee)}><option value="">Tất cả</option>{taskStatusSchema.options.map(value => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="task-assignee">Người phụ trách</label><select className={styles.select} id="task-assignee" value={assignee} onChange={event => filter(search, status, event.target.value)}><option value="">Tất cả</option>{data.context.members.map(member => <option key={member.id} value={member.id}>{memberName(member.id, data.context.members, data.context.users)}</option>)}</select></div>
        <button className={styles.button} onClick={() => filter(search, status, currentMember?.id ?? "")}>Việc của tôi</button>
        <button className={styles.button} onClick={() => filter("", "", "")}>Xóa bộ lọc</button>
        <button className={styles.button} onClick={state.reload}>Tải lại</button>
      </div>
      {!data.tasks.length ? <div className={styles.notice}><p>Chưa có công việc được công bố. Kế hoạch đang được trưởng nhóm hoàn thiện.</p>{currentMember?.role === "leader" && <Link href={routes.plan(projectId)}>Mở kế hoạch để kiểm tra và duyệt</Link>}</div> :
       !visible.length ? <p>Không tìm thấy công việc phù hợp với bộ lọc.</p> :
       <table className={styles.table}><thead><tr><th>Công việc</th><th>Người phụ trách</th><th>Trạng thái</th><th>Hạn chót</th><th>Trở ngại / phụ thuộc</th><th>Cập nhật gần nhất</th></tr></thead><tbody>{visible.map(task => <tr key={task.id}>
         <td><Link href={routes.task(projectId, task.id)}>{task.title}</Link></td>
         <td><span className={styles.mobileLabel}>Phụ trách: </span>{memberName(task.assigneeMemberId, data.context.members, data.context.users)}</td>
         <td><StatusBadge status={task.status} /></td><td><span className={styles.mobileLabel}>Hạn: </span>{displayTime(task.deadline, data.context.project.timeZone)} {overdue(task.deadline, task.status) && <StatusBadge status="overdue" />}</td>
         <td>{task.status === "blocked" && task.latestProgressUpdate?.blocker && <p>Trở ngại: {task.latestProgressUpdate.blocker}</p>}{task.dependencyTaskIds.length ? task.dependencyTaskIds.map(id => <div key={id}><Link href={routes.task(projectId, id)}>{data.tasks.find(item => item.id === id)?.title ?? id}</Link>{data.tasks.find(item => item.id === id)?.status !== "done" && " · chưa hoàn thành"}</div>) : "Không có phụ thuộc"}</td>
         <td>{task.latestProgressUpdate ? displayTime(task.latestProgressUpdate.createdAt, data.context.project.timeZone) : "Chưa có cập nhật"}</td>
       </tr>)}</tbody></table>}
    </>}
  </main>;
}
