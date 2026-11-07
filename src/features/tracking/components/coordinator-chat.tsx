"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FeedItem, FeedPage } from "@/contracts/coordinator";
import type { Message, Task } from "@/contracts";
import type { WorkspaceData } from "../model";
import { formatTime } from "../model";
import { requestKey } from "./client-data";
import { coordinatorRequest as api } from "./coordinator-client";
import { DailyCheckin } from "./daily-checkin";
import { CoordinatorSettings } from "./coordinator-settings";
import styles from "./coordinator.module.css";
type Inbox = {
    items: {
        id: string;
        text: string;
        target: string;
        createdAt: string;
        readAt: string | null;
    }[];
    unread: number;
    cursor: string | null;
};
export function CoordinatorChat({ data, onOpenTask }: {
    data: WorkspaceData;
    onOpenTask: (task: Task, element: HTMLElement) => void;
}) {
    const router = useRouter(), projectId = data.project.id, path = `/api/projects/${encodeURIComponent(projectId)}`;
    const [items, setItems] = useState<FeedItem[]>([]), [content, setContent] = useState(""), [taskId, setTaskId] = useState(""), [mentions, setMentions] = useState<string[]>([]), [replyToId, setReply] = useState<string | null>(null), [recordUpdate, setRecordUpdate] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [feedError, setFeedError] = useState(""), [loading, setLoading] = useState(true), [hasOlder, setHasOlder] = useState(false), [newMessages, setNewMessages] = useState(false), [inbox, setInbox] = useState<Inbox>({ items: [], unread: 0, cursor: null });
    const attempt = useRef<{
        input: string;
        key: string;
    } | null>(null), feed = useRef<HTMLDivElement>(null), sync = useRef<string | null>(null), older = useRef<string | null>(null), polling = useRef(false), pendingAfter = useRef<string | null>(null), lastInbox = useRef(0), mounted = useRef(true);
    function merge(next: FeedItem[]) {
        setItems(previous => {
            const map = new Map(previous.map(i => [`${i.kind}:${i.id}`, i]));
            for (const item of next)
                map.set(`${item.kind}:${item.id}`, item);
            return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
        });
    }
    const poll = useCallback(async (initial = false) => {
        if (polling.current || !initial && (document.hidden || !navigator.onLine))
            return;
        polling.current = true;
        const nearBottom = !feed.current || feed.current.scrollHeight - feed.current.scrollTop - feed.current.clientHeight < 100;
        try {
            const query = initial ? "" : `?since=${encodeURIComponent(sync.current ?? new Date().toISOString())}${pendingAfter.current ? `&after=${encodeURIComponent(pendingAfter.current)}` : ""}`;
            const page = await api<FeedPage>(`${path}/chat-feed${query}`);
            if (!mounted.current)
                return;
            merge(page.items);
            setFeedError("");
            if (initial) {
                sync.current = page.syncCursor;
                older.current = page.olderCursor;
                setHasOlder(page.hasMore);
            }
            else {
                pendingAfter.current = page.hasMore ? page.cursor : null;
                if (!page.hasMore)
                    sync.current = page.syncCursor;
            }
            if (nearBottom)
                requestAnimationFrame(() => {
                    if (feed.current)
                        feed.current.scrollTop = feed.current.scrollHeight;
                });
            else if (page.items.length)
                setNewMessages(true);
            if (initial || Date.now() - lastInbox.current > 60000) {
                const notifications = await api<Inbox>(`/api/notifications?projectId=${encodeURIComponent(projectId)}`);
                if (mounted.current)
                    setInbox(notifications);
                lastInbox.current = Date.now();
            }
        }
        catch (e) {
            if (mounted.current)
                setFeedError((e as Error).message);
        }
        finally {
            polling.current = false;
            if (mounted.current)
                setLoading(false);
        }
    }, [path, projectId]);
    useEffect(() => { mounted.current = true; sync.current = null; pendingAfter.current = null; void poll(true); const timer = setInterval(() => void poll(), 7500); const resume = () => void poll(sync.current === null); document.addEventListener("visibilitychange", resume); window.addEventListener("online", resume); return () => { mounted.current = false; clearInterval(timer); document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume); }; }, [poll]);
    useEffect(() => {
        if (!content.trim())
            return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [content]);
    async function loadOlder() {
        if (!older.current || polling.current)
            return;
        polling.current = true;
        const previousHeight = feed.current?.scrollHeight ?? 0;
        try {
            const page = await api<FeedPage>(`${path}/chat-feed?before=${encodeURIComponent(older.current)}`);
            merge(page.items);
            older.current = page.olderCursor;
            setHasOlder(page.hasMore);
            requestAnimationFrame(() => {
                if (feed.current)
                    feed.current.scrollTop = feed.current.scrollHeight - previousHeight;
            });
        }
        catch (e) {
            setFeedError((e as Error).message);
        }
        finally {
            polling.current = false;
        }
    }
    async function send(e: FormEvent) {
        e.preventDefault();
        if (busy || !content.trim())
            return;
        setBusy(true);
        setError("");
        const body = { content, taskId: taskId || null, replyToId, mentionMemberIds: mentions, recordUpdate };
        try {
            await api(`${path}/chat-posts`, "POST", body, requestKey(attempt, body));
            setContent("");
            setReply(null);
            setMentions([]);
            attempt.current = null;
            await poll();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    const author = (id: string) => data.members.find(m => m.member.id === id)?.user.displayName ?? "Thành viên";
    return <div className={styles.grid}><div><section className={styles.panel}><div className={styles.row}><div><h2>Trao đổi trong nhóm</h2><p className={styles.muted}>Tin nhắn được lưu trước khi Coordinator phân tích. Mỗi cập nhật task vẫn cần đúng người và đúng phiên bản.</p></div><button className={styles.button} onClick={() => void poll(sync.current === null)}>Tải tin mới</button></div>
    {feedError && <p role="alert" className={styles.error}>{feedError} <button className={styles.button} onClick={() => void poll(sync.current === null)}>Thử tải lại</button></p>}
    <div ref={feed} className={styles.feed} role="log" aria-label="Trao đổi dự án" aria-live="polite" aria-busy={loading}>
      {hasOlder && <button className={styles.button} onClick={() => void loadOlder()}>Tải tin cũ</button>}
      {loading ? <p>Đang tải trao đổi…</p> : !items.length ? <p>Chưa có trao đổi. Gửi lời chào hoặc cập nhật đầu tiên.</p> : null}
      {items.map(item => {
            if (item.kind === "event")
                return <article id={item.id} className={`${styles.message} ${styles.system}`} key={item.id}><strong>Coordinator <span className={styles.badge}>Hệ thống</span></strong><time className={styles.muted}> · {formatTime(item.createdAt, data.project.timeZone)}</time><p>{item.event.text}</p><Link href={item.event.target}>Mở nội dung liên quan</Link></article>;
            const post = item.kind === "post" ? item.post : null, message = item.kind === "legacy" ? item.message : post?.analysis, authorId = post?.authorMemberId ?? message!.authorMemberId, linkedTask = post?.taskId ?? message?.taskId;
            return <article id={item.id} className={`${styles.message} ${authorId === data.actor.id ? styles.mine : ""}`} key={`${item.kind}:${item.id}`}>
          <strong>{author(authorId)}</strong><time className={styles.muted}> · {formatTime(item.createdAt, data.project.timeZone)}</time>
          {post?.replyToId && <p className={styles.muted}>Trích dẫn tin <a href={`#${post.replyToId}`}>{post.replyToId.slice(0, 8)}</a></p>}
          <p>{post?.content ?? message?.content}</p>{post?.mentionMemberIds.length ? <p className={styles.muted}>{post.mentionMemberIds.map(id => `@${author(id)}`).join(" ")}</p> : null}
          {linkedTask && <button className={styles.button} onClick={e => {
                        const task = data.tasks.find(t => t.id === linkedTask);
                        if (task)
                            onOpenTask(task, e.currentTarget);
                    }}># {data.tasks.find(t => t.id === linkedTask)?.title ?? linkedTask}</button>}
          {post && <div className={styles.row}><span className={styles.badge}>Đã lưu</span><small className={styles.muted}>{post.analysisStatus === "queued" ? "Đang chờ phân tích" : post.analysisStatus === "failed" ? "Đã lưu tin nhắn, chưa phân tích được" : post.analysisStatus === "skipped" ? "Trao đổi trong nhóm" : ""}</small><button className={styles.button} onClick={() => setReply(post.id)}>Trích dẫn</button></div>}
          {message && <><p className={styles.muted}>Coordinator · {message.aiMode === "real" ? "AI thật (real)" : "Mô phỏng (mock)"} · {message.resolution === "applied" ? "Đã cập nhật task" : message.resolution === "no_change" ? "Chỉ ghi nhận trao đổi" : "Cần xác nhận"}</p>{message.clarificationQuestion && <p>{message.clarificationQuestion}</p>}{message.resolution === "clarification_required" && authorId === data.actor.id && <Resolve data={data} postId={post?.id} message={message} onSaved={() => { void poll(); router.refresh(); }}/>}</>}
        </article>;
        })}
    </div>
    {newMessages && <button className={styles.button} onClick={() => {
                if (feed.current)
                    feed.current.scrollTop = feed.current.scrollHeight;
                setNewMessages(false);
            }}>Có tin nhắn mới ↓</button>}
    <form className={styles.form} onSubmit={send} aria-label="Gửi tin nhắn" aria-busy={busy}>
      {replyToId && <p>Đang trích dẫn tin {replyToId.slice(0, 8)} <button type="button" className={styles.button} onClick={() => setReply(null)}>Bỏ trích dẫn</button></p>}
      <label>Công việc #<select value={taskId} onChange={e => setTaskId(e.target.value)} disabled={busy}><option value="">Chưa gắn task</option>{data.tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      <label>Nội dung cập nhật<textarea value={content} required maxLength={8000} disabled={busy} onChange={e => setContent(e.target.value)} onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
            }
        }}/></label>
      {content.endsWith("@") && <div className={styles.row}>{data.members.map(({ member, user }) => <button type="button" className={styles.button} key={member.id} onClick={() => { setContent(content + user.displayName + " "); setMentions([...new Set([...mentions, member.id])]); }}>@{user.displayName}</button>)}</div>}
      {content.endsWith("#") && <div className={styles.row}>{data.tasks.map(task => <button type="button" className={styles.button} key={task.id} onClick={() => { setContent(content + task.title + " "); setTaskId(task.id); }}>#{task.title}</button>)}</div>}
      <details><summary>Nhắc thành viên @</summary>{data.members.filter(m => m.member.id !== data.actor.id).map(({ member, user }) => <label key={member.id} className={styles.check}><input type="checkbox" checked={mentions.includes(member.id)} onChange={e => setMentions(e.target.checked ? [...mentions, member.id] : mentions.filter(id => id !== member.id))}/>{user.displayName}</label>)}</details>
      <label className={styles.check}><input type="checkbox" checked={recordUpdate} onChange={e => setRecordUpdate(e.target.checked)}/>Nhờ Coordinator ghi nhận cập nhật</label>
      <p className={styles.muted}>Enter gửi · Shift + Enter xuống dòng. Tự báo xong cần nộp bài và nghiệm thu riêng.</p>
      {error && <p role="alert" className={styles.error}>{error} Nội dung được giữ để thử lại.</p>}
      <button className={`${styles.button} ${styles.primary}`} disabled={busy || !content.trim()}>{busy ? "Đang lưu…" : error ? "Thử gửi lại" : "Gửi tin nhắn"}</button>
    </form>
  </section><DailyCheckin data={data}/></div>
  <aside><section className={styles.panel}><h2>Thông báo <span className={styles.badge}>{inbox.unread} chưa đọc</span></h2><ul className={styles.items}>{inbox.items.map(n => <li className={styles.item} key={n.id}><Link href={n.target}>{n.text}</Link>{!n.readAt && <button className={styles.button} onClick={() => { void api(`/api/notifications/${n.id}/read`, "POST", {}).then(() => setInbox(old => ({ ...old, unread: Math.max(0, old.unread - 1), items: old.items.map(item => item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item) }))).catch(e => setFeedError((e as Error).message)); }}>Đánh dấu đã đọc</button>}</li>)}</ul>{inbox.cursor && <button className={styles.button} onClick={() => void api<Inbox>(`/api/notifications?projectId=${encodeURIComponent(projectId)}&cursor=${encodeURIComponent(inbox.cursor!)}`).then(next => setInbox(old => ({ ...next, items: [...old.items, ...next.items] }))).catch(e => setFeedError((e as Error).message))}>Thông báo cũ hơn</button>}</section><CoordinatorSettings data={data}/></aside>
  </div>;
}
function Resolve({ data, postId, message, onSaved }: {
    data: WorkspaceData;
    postId?: string;
    message: Message;
    onSaved: () => void;
}) {
    const [taskId, setTaskId] = useState(""), [status, setStatus] = useState("in_progress"), [blocker, setBlocker] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const attempt = useRef<{
        input: string;
        key: string;
    } | null>(null);
    async function submit(e: FormEvent) {
        e.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setError("");
        try {
            const task = await api<Task>(`/api/tasks/${encodeURIComponent(taskId)}`);
            // Confirm the displayed task version, rather than silently upgrading the user's expectation.
            const shown = data.tasks.find(t => t.id === taskId);
            if (!shown || task.version !== shown.version)
                throw new Error("Task đã thay đổi. Tải lại trang, kiểm tra rồi xác nhận.");
            const body = { taskId, requestedStatus: status, expectedTaskVersion: shown.version, ...(status === "blocked" ? { blocker } : {}) };
            await api(postId ? `/api/chat-posts/${postId}/resolve` : `/api/messages/${message.id}/resolve`, "POST", body, requestKey(attempt, body));
            attempt.current = null;
            onSaved();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <form className={styles.form} onSubmit={submit}><label>Công việc cần xác nhận<select required value={taskId} onChange={e => setTaskId(e.target.value)}><option value="">Chọn công việc</option>{data.tasks.filter(t => (data.actor.role === "leader" || t.assigneeMemberId === data.actor.id) && ["todo", "in_progress", "blocked"].includes(t.status)).map(t => <option value={t.id} key={t.id}>{t.title}</option>)}</select></label><label>Trạng thái xác nhận<select value={status} onChange={e => setStatus(e.target.value)}><option value="in_progress">Đang làm</option><option value="blocked">Bị chặn</option></select></label>{status === "blocked" && <label>Trở ngại cụ thể<textarea value={blocker} required maxLength={5000} onChange={e => setBlocker(e.target.value)}/></label>}{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.button} disabled={busy || !taskId}>Xác nhận cập nhật</button></form>;
}
