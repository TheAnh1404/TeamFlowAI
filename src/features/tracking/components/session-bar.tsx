"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/contracts";
import styles from "./tracking.module.css";

export function DemoSessionBar({ user }: { user?: User }) {
  const router = useRouter();
  const [account, setAccount] = useState("TV2"); const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account, accessCode }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể đăng nhập.");
      setAccessCode(""); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể kết nối."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Không thể đăng xuất.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể kết nối."); }
    finally { setBusy(false); }
  }
  return <section className={styles.session} aria-label="Phiên demo">
    <p><strong>Phiên demo</strong>{user ? ` · Đang dùng ${user.displayName}` : " · Chọn tài khoản để bắt đầu"}</p>
    <form onSubmit={submit} className={styles.toolbar}>
      <label>Tài khoản<select value={account} onChange={(e) => setAccount(e.target.value)} disabled={busy}>
        <option value="TV1">TV1 — Trưởng nhóm demo</option><option value="TV2">TV2 — Backend demo</option><option value="TV3">TV3 — Nghiệm thu demo</option>
      </select></label>
      <label>Mã truy cập demo<input type="password" autoComplete="off" value={accessCode} minLength={16} maxLength={200} required onChange={(e) => setAccessCode(e.target.value)} disabled={busy} /></label>
      <button type="submit" disabled={busy}>{busy ? "Đang xử lý…" : user ? "Đổi tài khoản" : "Vào phiên demo"}</button>
      {user && <button type="button" disabled={busy} onClick={logout}>Đăng xuất</button>}
    </form>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </section>;
}
