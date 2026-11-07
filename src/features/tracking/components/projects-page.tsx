"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { projectSummarySchema, sessionSchema, type SessionData } from "@/contracts";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { apiRoutes, routes } from "@/lib/routes";
import { displayTime, LoadNotice } from "./shared";
import { useRemoteData } from "./client-data";
import styles from "./tracking.module.css";

export function ProjectsPage() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const loader = useCallback(async () => {
    let session: SessionData;
    try { session = (await apiFetch(apiRoutes.tracking.session, sessionSchema)).data; }
    catch (error) { if (error instanceof ApiClientError && error.status === 401) return { session: null, projects: [] }; throw error; }
    const projects = (await apiFetch(apiRoutes.planning.projects, z.array(projectSummarySchema))).data;
    return { session, projects };
  }, []);
  const state = useRemoteData(loader);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setMessage(null);
    try {
      await apiFetch(apiRoutes.tracking.session, sessionSchema, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demoAccount: form.get("demoAccount"), accessCode: form.get("accessCode") }) });
      if (codeRef.current) codeRef.current.value = "";
      state.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể thiết lập phiên."); }
    finally { setPending(false); }
  }
  async function signOut() {
    setPending(true); setMessage(null);
    try { await apiFetch(apiRoutes.tracking.session, z.object({ signedOut: z.boolean() }), { method: "DELETE" }); state.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Không thể kết thúc phiên."); }
    finally { setPending(false); }
  }
  return <main className={styles.workspace}>
    <nav className={styles.tabs}><Link href={routes.home}>Trang chủ</Link></nav>
    <h1>Dự án của nhóm</h1>
    <p className={styles.subtitle}>Phiên demo chỉ dành cho nhóm có mã truy cập. Quyền trưởng nhóm/thành viên được xác định riêng trong từng dự án.</p>
    <form onSubmit={signIn} className={styles.toolbar} aria-label="Thiết lập phiên demo">
      <div className={styles.field}><label htmlFor="demo-account">Tài khoản demo</label><select className={styles.select} id="demo-account" name="demoAccount" disabled={pending}><option>TV1</option><option>TV2</option><option>TV3</option></select></div>
      <div className={styles.field}><label htmlFor="demo-code">Mã truy cập demo</label><input ref={codeRef} className={styles.input} id="demo-code" name="accessCode" type="password" required autoComplete="off" maxLength={256} disabled={pending} /></div>
      <button className={styles.button + " " + styles.primary} disabled={pending}>{pending ? "Đang xử lý…" : "Thiết lập / đổi phiên demo"}</button>
    </form>
    {message && <p role="alert" className={styles.notice + " " + styles.error}>{message}</p>}
    <LoadNotice loading={state.loading} error={state.error} retry={state.reload} />
    {state.data?.session && <>
      <div className={styles.actions}><p>Phiên hiện tại: <strong>{state.data.session.user.displayName}</strong></p><button className={styles.button} onClick={signOut} disabled={pending}>Kết thúc phiên</button><Link href={routes.newProject}>Tạo dự án</Link></div>
      {!state.data.projects.length ? <p className={styles.notice}>Bạn chưa tham gia dự án nào. Hãy tạo dự án hoặc chờ trưởng nhóm thêm thành viên.</p> :
      <table className={styles.table}><thead><tr><th>Dự án</th><th>Thời hạn</th><th>Thành viên</th><th>Công việc</th><th>Điều hướng</th></tr></thead><tbody>{state.data.projects.map(project => <tr key={project.id}>
        <td><strong>{project.name}</strong><p>{project.goal}</p></td><td data-label="Thời hạn">{displayTime(project.deadline, project.timeZone)}</td><td>{project.memberCount} thành viên</td>
        <td>{project.taskCounts.done}/{project.taskCounts.total} đã nghiệm thu · {project.taskCounts.blocked} bị chặn</td>
        <td><Link href={project.planStatus === "published" ? routes.tasks(project.id) : routes.plan(project.id)}>{project.planStatus === "published" ? "Mở công việc" : "Xem kế hoạch"}</Link></td>
      </tr>)}</tbody></table>}
    </>}
  </main>;
}
