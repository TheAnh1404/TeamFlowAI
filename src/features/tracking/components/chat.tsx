"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { messageSchema, progressUpdateSchema, taskSchema, type Message, type Task } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes, routes } from "@/lib/routes";
import { loadContext, memberName, requestKey, useRemoteData, type TrackingContext } from "./client-data";
import { displayTime, LoadNotice, ProjectNav } from "./shared";
import styles from "./tracking.module.css";

const mutationResult = z.object({ message: messageSchema, progressUpdate: progressUpdateSchema.nullable(), task: taskSchema.nullable() });

function ResolveForm({ message, tasks, context, onSaved }: { message: Message; tasks: Task[]; context: TrackingContext; onSaved: () => void }) {
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState("in_progress");
  const [blocker, setBlocker] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useRef<{ input: string; key: string } | null>(null);
  const member = context.session.memberships.find(item => item.projectId === message.projectId);
  const task = tasks.find(item => item.id === taskId);
  const allowed = task && member && (member.role === "leader" || task.assigneeMemberId === member.id);
  async function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !allowed || pending) return;
    setPending(true); setError(null);
    const body = { taskId, requestedStatus: status, ...(status === "blocked" ? { blocker } : {}), expectedTaskVersion: task.version };
    try {
      await apiFetch(apiRoutes.tracking.resolve(message.id), mutationResult, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey(mutation, body) }, body: JSON.stringify(body) });
      mutation.current = null; onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xác nhận."); }
    finally { setPending(false); }
  }
  return <form className={styles.resolve} onSubmit={resolve} aria-label="Làm rõ cập nhật">
    <div className={styles.toolbar}>
      <div className={styles.field}><label htmlFor={"resolve-task-" + message.id}>Công việc cần cập nhật</label><select className={styles.select} id={"resolve-task-" + message.id} value={taskId} onChange={event => setTaskId(event.target.value)} required disabled={pending}><option value="">Chọn đúng công việc</option>{tasks.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
      <div className={styles.field}><label htmlFor={"resolve-status-" + message.id}>Trạng thái xác nhận</label><select className={styles.select} id={"resolve-status-" + message.id} value={status} onChange={event => setStatus(event.target.value)} disabled={pending}><option value="in_progress">Đang làm</option><option value="blocked">Bị chặn</option></select></div>
    </div>
    {status === "blocked" && <div className={styles.field}><label htmlFor={"resolve-blocker-" + message.id}>Trở ngại cụ thể</label><textarea className={styles.textarea} id={"resolve-blocker-" + message.id} value={blocker} onChange={event => setBlocker(event.target.value)} required maxLength={5000} disabled={pending} /></div>}
    {task && !allowed && <p>Bạn không phải người phụ trách công việc này và không có quyền trưởng nhóm.</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.actions}><button className={styles.button} disabled={pending || !allowed || (status === "blocked" && !blocker.trim())}>{pending ? "Đang xác nhận…" : "Xác nhận cập nhật"}</button></div>
  </form>;
}

export function ProjectChat({ projectId }: { projectId: string }) {
  const [content, setContent] = useState("");
  const [taskId, setTaskId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useRef<{ input: string; key: string } | null>(null);
  const loader = useCallback(async () => {
    const [context, tasks, messages] = await Promise.all([
      loadContext(projectId), apiFetch(apiRoutes.tracking.tasks(projectId), z.array(taskSchema)),
      apiFetch(apiRoutes.tracking.messages(projectId), z.array(messageSchema)),
    ]);
    return { context, tasks: tasks.data, messages: messages.data };
  }, [projectId]);
  const state = useRemoteData(loader);
  useEffect(() => {
    if (!content.trim()) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [content]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !content.trim()) return;
    setPending(true); setError(null);
    const body = { content, ...(taskId ? { taskId } : {}) };
    try {
      await apiFetch(apiRoutes.tracking.messages(projectId), mutationResult, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey(mutation, body) }, body: JSON.stringify(body) });
      setContent(""); mutation.current = null; state.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Tin nhắn chưa được lưu."); }
    finally { setPending(false); }
  }
  const data = state.data;
  const member = data?.context.session.memberships.find(item => item.projectId === projectId);
  return <main className={styles.workspace}>
    <ProjectNav projectId={projectId} /><h1>Kênh trao đổi dự án</h1>
    <p className={styles.subtitle}>Ghi nhận tiến độ hoặc trở ngại. Khi chưa rõ công việc hoặc ý định, Coordinator sẽ hỏi lại trước khi cập nhật.</p>
    <p className={styles.meta}>Phiên TV2 mặc định dùng quy tắc demo (mock). Mỗi tin nhắn hiển thị đúng nguồn xử lý; lỗi AI thật không được tự thay bằng mock.</p>
    <LoadNotice loading={state.loading} error={state.error} retry={state.reload} />
    {data && <>
      <div className={styles.actions}><span>Phiên: {data.context.session.user.displayName}</span><button className={styles.button} onClick={state.reload}>Tải tin nhắn mới</button></div>
      {!data.messages.length ? <p className={styles.notice}>Chưa có tin nhắn. Thiếu cập nhật không đồng nghĩa thành viên không làm việc.</p> :
      <ol className={styles.feed} aria-label="Lịch sử trao đổi">{data.messages.map(message => <li className={styles.message} key={message.id}>
        <div className={styles.messageHeader}><strong>{memberName(message.authorMemberId, data.context.members, data.context.users)}</strong><time className={styles.meta} dateTime={message.createdAt}>{displayTime(message.createdAt, data.context.project.timeZone)}</time><span className={styles.badge}>{message.resolution === "applied" ? "Đã cập nhật" : message.resolution === "clarification_required" ? "Cần làm rõ" : "Chỉ lưu trao đổi"}</span></div>
        <p>{message.content}</p>
        {message.taskId && <Link href={routes.task(projectId, message.taskId)}>{data.tasks.find(task => task.id === message.taskId)?.title ?? message.taskId}</Link>}
        <p className={styles.meta}>Coordinator · {message.aiMode === "mock" ? "Mô phỏng (mock)" : "AI thật (real)"}</p>
        {message.clarificationQuestion && <p className={styles.notice}>{message.clarificationQuestion}</p>}
        {message.resolution === "clarification_required" && message.authorMemberId === member?.id &&
          <ResolveForm message={message} tasks={data.tasks} context={data.context} onSaved={state.reload} />}
      </li>)}</ol>}
      <form onSubmit={send} className={styles.section} aria-label="Gửi tin nhắn" aria-busy={pending}>
        <div className={styles.field}><label htmlFor="message-task">Liên kết công việc (nếu đã xác định)</label><select className={styles.select} id="message-task" value={taskId} onChange={event => setTaskId(event.target.value)} disabled={pending}><option value="">Chưa chọn công việc</option>{data.tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="message-content">Nội dung cập nhật / trao đổi</label><textarea className={styles.textarea} id="message-content" value={content} onChange={event => setContent(event.target.value)} maxLength={5000} disabled={pending} required onKeyDown={event => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
        }} /></div>
        <p className={styles.meta}>Enter để gửi, Shift + Enter xuống dòng. Chat không thay deadline, người phụ trách, tiêu chí hoặc tự nghiệm thu.</p>
        {error && <p role="alert" className={styles.notice + " " + styles.error}>Chưa gửi được: {error} Nội dung được giữ để thử lại.</p>}
        <button className={styles.button + " " + styles.primary} disabled={pending || !content.trim()}>{pending ? "Đang xử lý…" : error ? "Thử gửi lại" : "Gửi tin nhắn"}</button>
      </form>
    </>}
  </main>;
}
