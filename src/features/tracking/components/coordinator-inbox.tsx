"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { coordinatorRequest as api } from "./coordinator-client";
import styles from "./coordinator.module.css";
type Inbox = {
    items: {
        id: string;
        text: string;
        target: string;
        readAt: string | null;
        projectId: string;
    }[];
    unread: number;
    cursor: string | null;
};
export function CoordinatorInbox() {
    const [inbox, setInbox] = useState<Inbox>({ items: [], unread: 0, cursor: null }), [error, setError] = useState(""), [token, setToken] = useState<string | null>(null), [message, setMessage] = useState(""), [project, setProject] = useState("");
    useEffect(() => {
        let active = true;
        Promise.resolve().then(() => {
            if (!active)
                return;
            const url = new URL(window.location.href), value = url.searchParams.get("verifyEmail");
            if (value) {
                setToken(value);
                url.searchParams.delete("verifyEmail");
                window.history.replaceState(null, "", url.pathname + url.search + url.hash);
            }
            void api<Inbox>("/api/notifications").then(value => {
                if (active)
                    setInbox(value);
            }).catch(e => {
                if (active)
                    setError((e as Error).message);
            });
        });
        return () => { active = false; };
    }, []);
    async function verify() {
        setError("");
        try {
            await api("/api/auth/email-verification", "POST", token ? { token } : {});
            setMessage(token ? "Đã xác minh địa chỉ email." : "Đã lưu yêu cầu gửi email xác minh. Kiểm tra hộp thư sau khi hệ thống xử lý.");
            setToken(null);
        }
        catch (e) {
            setError((e as Error).message);
        }
    }
    return <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--color-border-subtle)", background: "var(--color-surface)" }}><details><summary>Thông báo <span className={styles.badge}>{inbox.unread} chưa đọc</span></summary><div className={styles.row}><button className={styles.button} onClick={() => void api<Inbox>(`/api/notifications${project ? `?projectId=${encodeURIComponent(project)}` : ""}`).then(setInbox).catch(e => setError((e as Error).message))}>Làm mới thông báo</button><label>Lọc dự án <select className={styles.input} value={project} onChange={e => { setProject(e.target.value); void api<Inbox>(`/api/notifications${e.target.value ? `?projectId=${encodeURIComponent(e.target.value)}` : ""}`).then(setInbox).catch(e => setError((e as Error).message)); }}><option value="">Mọi dự án</option>{[...new Set(inbox.items.map(n => n.projectId))].map(id => <option key={id} value={id}>{id}</option>)}</select></label><button className={styles.button} onClick={() => void verify()}>Yêu cầu xác minh email</button></div><ul className={styles.items}>{inbox.items.map(n => <li key={n.id}><Link href={n.target}>{n.text}</Link>{!n.readAt && <button className={styles.button} onClick={() => void api(`/api/notifications/${n.id}/read`, "POST", {}).then(() => setInbox(old => ({ ...old, unread: Math.max(0, old.unread - 1), items: old.items.map(i => i.id === n.id ? { ...i, readAt: new Date().toISOString() } : i) }))).catch(e => setError((e as Error).message))}>Đã đọc</button>}</li>)}</ul>{inbox.cursor && <button className={styles.button} onClick={() => void api<Inbox>(`/api/notifications?cursor=${encodeURIComponent(inbox.cursor!)}${project ? `&projectId=${encodeURIComponent(project)}` : ""}`).then(next => setInbox(old => ({ ...next, items: [...old.items, ...next.items] }))).catch(e => setError((e as Error).message))}>Tải thông báo cũ</button>}</details>{token && <p>Bạn đang đăng nhập tài khoản nhận liên kết? <button className={`${styles.button} ${styles.primary}`} onClick={() => void verify()}>Xác minh email của tôi</button></p>}{message && <p role="status">{message}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}</div>;
}
