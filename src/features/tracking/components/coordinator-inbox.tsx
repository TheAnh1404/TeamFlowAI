"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { coordinatorRequest as api } from "./coordinator-client";
import styles from "./coordinator.module.css";

type Inbox = {
  items: { id: string; text: string; target: string; readAt: string | null; projectId: string }[];
  unread: number;
  cursor: string | null;
};

export function CoordinatorInbox() {
  const [inbox, setInbox] = useState<Inbox>({ items: [], unread: 0, cursor: null });
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [project, setProject] = useState("");

  const refresh = useCallback(async (projectId = project) => {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const value = await api<Inbox>(`/api/notifications${query}`);
    setInbox(value);
    setError("");
  }, [project]);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const verifyToken = url.searchParams.get("verifyEmail");
    if (verifyToken) {
      url.searchParams.delete("verifyEmail");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      Promise.resolve().then(() => { if (active) setToken(verifyToken); });
    }
    const query = project ? `?projectId=${encodeURIComponent(project)}` : "";
    const load = () => api<Inbox>(`/api/notifications${query}`).then(value => {
      if (active) { setInbox(value); setError(""); }
    }).catch(cause => { if (active) setError((cause as Error).message); });
    void load();
    const timer = window.setInterval(() => { void load(); }, 30_000);
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [project]);

  async function verify() {
    setError("");
    try {
      await api("/api/auth/email-verification", "POST", token ? { token } : {});
      setMessage(token ? "Đã xác minh địa chỉ email." : "Đã lưu yêu cầu gửi email xác minh.");
      setToken(null);
    } catch (cause) { setError((cause as Error).message); }
  }

  async function markRead(id: string) {
    try {
      await api(`/api/notifications/${encodeURIComponent(id)}/read`, "POST", {});
      setInbox(current => ({ ...current, unread: Math.max(0, current.unread - 1), items: current.items.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) }));
    } catch (cause) { setError((cause as Error).message); }
  }

  return <div className="tf-inbox" style={{ position: "relative" }}>
    <details>
      <summary>Thông báo <span className={styles.badge} aria-live="polite">{inbox.unread} chưa đọc</span></summary>
      <div className="tf-inbox-panel" style={{ minWidth: 320, maxWidth: 480, maxHeight: "70vh", overflow: "auto" }}>
        <h2>Thông báo</h2>
        <div className={styles.row}>
          <label>Lọc dự án <select className={styles.input} value={project} onChange={event => { const value = event.target.value; setProject(value); void refresh(value).catch(cause => setError((cause as Error).message)); }}>
            <option value="">Mọi dự án</option>
            {[...new Set(inbox.items.map(item => item.projectId))].map(id => <option key={id} value={id}>{id}</option>)}
          </select></label>
          <button type="button" className={styles.button} onClick={() => void refresh().catch(cause => setError((cause as Error).message))}>Làm mới</button>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {!inbox.items.length && !error && <p>Chưa có thông báo.</p>}
        <ul className={styles.items}>{inbox.items.map(item => <li key={item.id}>
          <Link href={item.target} onClick={() => { if (!item.readAt) void markRead(item.id); }}>{item.text}</Link>
          {!item.readAt && <button type="button" className={styles.button} onClick={() => void markRead(item.id)}>Đánh dấu đã đọc</button>}
        </li>)}</ul>
        {inbox.cursor && <button type="button" className={styles.button} onClick={() => {
          const query = new URLSearchParams({ cursor: inbox.cursor! });
          if (project) query.set("projectId", project);
          void api<Inbox>(`/api/notifications?${query}`).then(next => setInbox(current => ({ ...next, items: [...current.items, ...next.items] }))).catch(cause => setError((cause as Error).message));
        }}>Tải thông báo cũ</button>}
        <button type="button" className={styles.button} onClick={() => void verify()}>Yêu cầu xác minh email</button>
      </div>
    </details>
    {token && <p>Bạn có liên kết xác minh email. <button type="button" className={styles.button} onClick={() => void verify()}>Xác minh email</button></p>}
    {message && <p role="status">{message}</p>}
  </div>;
}
