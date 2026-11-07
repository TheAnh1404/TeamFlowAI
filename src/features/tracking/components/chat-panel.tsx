"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { progressMessageResultSchema, type Message, type ProgressMessageResult, type Task } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes } from "@/lib/routes";
import type { WorkspaceData } from "../model";
import { formatTime } from "./task-detail";
import styles from "./tracking.module.css";

async function mutate(url: string, body: unknown, key: string): Promise<ProgressMessageResult> {
  const result = await apiFetch(url, progressMessageResultSchema, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
  return result.data;
}
export function ChatPanel({ data, onOpenTask }: { data: WorkspaceData; onOpenTask: (task: Task, element: HTMLElement) => void }) {
  const router = useRouter(); const [content, setContent] = useState(""); const [taskId, setTaskId] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const feed = useRef<HTMLDivElement>(null); const atBottom = useRef(true); const [newMessages, setNewMessages] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (atBottom.current) feed.current?.scrollTo({ top: feed.current.scrollHeight });
    else setNewMessages(true);
  }, [data.messages]);
  async function submit(event?: FormEvent) {
    event?.preventDefault(); if (pending.current || !content.trim()) return;
    pending.current = true; setBusy(true); setError("");
    const body = { content: content.trim(), ...(taskId ? { taskId } : {}) }; const fingerprint = JSON.stringify(body);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try {
      await mutate(apiRoutes.tracking.messages(data.project.id), body, attempt.current.key);
      setContent(""); attempt.current = null; router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể gửi. Hãy thử lại."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section aria-labelledby="chat-title"><h2 id="chat-title">Kênh trao đổi dự án</h2><p className={styles.muted}>Cập nhật tiến độ hoặc nêu trở ngại tại đây. Coordinator sẽ hỗ trợ ghi nhận.</p>
    <div className={styles.feed} ref={feed} role="log" aria-label="Lịch sử chat" onScroll={(e) => { const element = e.currentTarget; atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 60; if (atBottom.current) setNewMessages(false); }}>
      {data.messages.length === 0 && <p className={styles.notice}>Chưa có tin nhắn. Chọn công việc và gửi cập nhật đầu tiên.</p>}
      {data.messages.map((message) => {
        const linkedTask = data.tasks.find((t) => t.id === message.taskId);
        return <article key={message.id} className={styles.message}><div className={styles.line}><strong>{data.members.find((m) => m.member.id === message.authorMemberId)?.user.displayName ?? "Thành viên"}</strong><time dateTime={message.createdAt} className={styles.muted}>{formatTime(message.createdAt, data.project.timeZone)}</time></div><p className={styles.prewrap}>{message.content}</p>
          {linkedTask && <button type="button" onClick={(e) => onOpenTask(linkedTask, e.currentTarget)}>{linkedTask.title}</button>}
          <div className={styles.agent}><div className={styles.line}><strong>Coordinator</strong><small className={styles.badge}>aiMode: {message.aiMode}</small></div>
            <p>{message.resolution === "applied" ? "Đã cập nhật công việc và lưu tiến độ." : message.resolution === "no_change" ? "Đã lưu trao đổi. Trạng thái công việc không thay đổi; chỉ người phụ trách hoặc trưởng nhóm được cập nhật qua chat." : message.clarificationQuestion}</p>
            {message.resolution === "clarification_required" && message.authorMemberId === data.actor.id && <ResolveForm message={message} data={data} />}
          </div>
        </article>;
      })}
    </div>
    {newMessages && <button type="button" onClick={() => { atBottom.current = true; feed.current?.scrollTo({ top: feed.current.scrollHeight }); setNewMessages(false); }}>Có tin nhắn mới ↓</button>}
    <form className={styles.composer} onSubmit={submit}>
      <label>Công việc liên quan (không bắt buộc)<select aria-label="Công việc liên quan (không bắt buộc)" value={taskId} onChange={(e) => setTaskId(e.target.value)} disabled={busy}><option value="">Để Coordinator hỏi lại khi chưa rõ</option>{data.tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      <label>Nội dung cập nhật<textarea rows={3} maxLength={8000} value={content} disabled={busy} required onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); void submit(); } }} /></label>
      <div className={styles.header}><small className={styles.muted}>Enter để gửi · Shift + Enter để xuống dòng. Chat không tự nghiệm thu hoàn thành.</small><button type="submit" className={styles.primary} disabled={busy || !content.trim()}>{busy ? "Đang ghi nhận…" : error ? "Gửi lại" : "Gửi"}</button></div>
      {error && <p role="alert" className={`${styles.notice} ${styles.error}`}>{error}</p>}
    </form>
  </section>;
}
function ResolveForm({ message, data }: { message: Message; data: WorkspaceData }) {
  const router = useRouter();
  const candidates = data.tasks.filter((t) => ["todo", "in_progress", "blocked"].includes(t.status) && (data.actor.role === "leader" || t.assigneeMemberId === data.actor.id));
  const [id, setId] = useState(""); const [status, setStatus] = useState<"in_progress" | "blocked">("blocked"); const [blocker, setBlocker] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const pending = useRef(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending.current) return;
    const task = candidates.find((t) => t.id === id); if (!task) return;
    pending.current = true; setBusy(true); setError("");
    const body = { taskId: id, requestedStatus: status, ...(status === "blocked" ? { blocker: blocker.trim() } : {}), expectedTaskVersion: task.version };
    const fingerprint = JSON.stringify(body); if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try { await mutate(apiRoutes.tracking.resolve(message.id), body, attempt.current.key); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể cập nhật."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <form className={styles.composer} onSubmit={submit}>
    <label>Chọn công việc cần cập nhật<select aria-label="Chọn công việc cần cập nhật" value={id} onChange={(e) => setId(e.target.value)} required disabled={busy}><option value="">Chọn công việc…</option>{candidates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
    <label>Trạng thái<select aria-label="Trạng thái cập nhật" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} disabled={busy}><option value="blocked">Bị chặn</option><option value="in_progress">Đang làm / tiếp tục</option></select></label>
    {status === "blocked" && <label>Mô tả trở ngại<textarea aria-label="Mô tả trở ngại" value={blocker} required maxLength={2000} onChange={(e) => setBlocker(e.target.value)} disabled={busy} /></label>}
    <button type="submit" disabled={busy || !id || (status === "blocked" && !blocker.trim())}>{busy ? "Đang ghi nhận…" : "Xác nhận cập nhật"}</button>
    {error && <div role="alert" className={styles.error}>{error}<br /><button type="button" onClick={() => router.refresh()}>Tải lại dữ liệu</button></div>}
  </form>;
}
