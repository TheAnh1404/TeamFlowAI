"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { coordinatorRequest as api } from "@/features/tracking/components/coordinator-client";
import { requestKey, loadContext } from "@/features/tracking/components/client-data";
import { localInstant } from "@/server/automation/time";
import type { ReportSummaryV2, SourceRefV2 } from "@/contracts/coordinator";
import type { createReportV2Service, SnapshotV2 } from "../server/coordinator-reports";
import type { createCoordinatorService } from "@/features/tracking/server/coordinator-service";
import { WeeklyReportView } from "./WeeklyReportView";
import styles from "@/features/tracking/components/coordinator.module.css";
type Report = Awaited<ReturnType<ReturnType<typeof createReportV2Service>["get"]>>;
type ReportList = Awaited<ReturnType<ReturnType<typeof createReportV2Service>["list"]>>;
type Meetings = Awaited<ReturnType<ReturnType<typeof createCoordinatorService>["meetings"]>>;
export function CoordinatorReports({ projectId }: {
    projectId: string;
}) {
    const path = `/api/projects/${encodeURIComponent(projectId)}`;
    const [reports, setReports] = useState<ReportList>([]), [selected, setSelected] = useState<Report | null>(null), [leader, setLeader] = useState(false), [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh"), [error, setError] = useState(""), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [start, setStart] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)), [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10)), [summary, setSummary] = useState<ReportSummaryV2>([]), [source, setSource] = useState<{
        asOf: string;
        entity: string;
        data: Record<string, unknown>;
    } | null>(null);
    const attempt = useRef<{
        input: string;
        key: string;
    } | null>(null), selectedId = useRef<string | null>(null), dialog = useRef<HTMLDialogElement>(null);
    const load = useCallback(async (id?: string) => {
        const rows = await api<ReportList>(`${path}/coordinator-reports`);
        setReports(rows);
        const target = id ?? selectedId.current ?? rows[0]?.id;
        if (target && rows.some(r => r.id === target)) {
            const report = await api<Report>(`/api/coordinator-reports/${target}`);
            setSelected(report);
            setSummary(report.summary ?? []);
            selectedId.current = report.id;
        }
    }, [path]);
    useEffect(() => {
        let active = true;
        void (async () => {
            try {
                const context = await loadContext(projectId);
                if (!active)
                    return;
                setLeader(context.members.some(m => m.userId === context.session.user.id && m.role === "leader"));
                setTimezone(context.project.timeZone);
                await load(new URLSearchParams(window.location.search).get("report") ?? undefined);
            }
            catch (e) {
                if (active)
                    setError((e as Error).message);
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [load, projectId]);
    useEffect(() => {
        const timer = setInterval(() => {
            if (!document.hidden && navigator.onLine && reports.some(r => ["queued", "generating"].includes(r.status)))
                void load().catch(e => setError((e as Error).message));
        }, 10000);
        return () => clearInterval(timer);
    }, [load, reports]);
    useEffect(() => {
        if (source && !dialog.current?.open)
            dialog.current?.showModal();
    }, [source]);
    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError("");
        try {
            await action();
            attempt.current = null;
            await load();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    async function showSource(ref: SourceRefV2) {
        if (!selected)
            return;
        try {
            const value = await api<{
                asOf: string;
                entity: string;
                data: Record<string, unknown>;
            }>(`/api/coordinator-reports/${selected.id}/sources?entity=${ref.entity}&id=${encodeURIComponent(ref.id)}`);
            setSource(value);
        }
        catch (e) {
            setError((e as Error).message);
        }
    }
    const snapshot = selected?.snapshot as unknown as SnapshotV2 | null, metrics = selected?.metrics;
    const rollup = (metrics?.memberRollup ?? []) as {
        id: string;
        name: string;
        selfReportedWork: {
            id: string;
            text: string;
            taskId: string | null;
            durationMinutes: number | null;
        }[];
        selfReportedMinutes: number | null;
        unknownDurationItems: number;
        submittedCheckins: number;
        expectedCheckins: number;
        submittedTasks: number;
        acceptedTasks: number;
        blockers: {
            text: string;
            revisionId: string;
        }[];
        sourceRefs: SourceRefV2[];
        lastUpdate: string | null;
    }[];
    return <main className="tf-page"><div className="tf-row"><div><p className="tf-eyebrow">COORDINATOR</p><h1>Báo cáo & chuẩn bị họp</h1></div><Link href={`/app/projects/${encodeURIComponent(projectId)}/chat`}>← Trao đổi dự án</Link></div>
    <nav className="tf-tabs" aria-label="Điều hướng dự án">{[["Công việc", "tasks"], ["Kế hoạch", "plan"], ["Chat", "chat"], ["Báo cáo", "reports"]].map(([label, part]) => <Link key={part} href={`/app/projects/${encodeURIComponent(projectId)}/${part}`} aria-current={part === "reports" ? "page" : undefined}>{label}</Link>)}</nav>
    <p className={styles.muted}>Mỗi báo cáo giữ nguồn và số liệu tại mốc chụp. Bản nháp chỉ trưởng nhóm xem; thành viên đọc sau khi được chia sẻ.</p>
    {loading && <p role="status">Đang tải báo cáo…</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
    {leader && <details className={styles.panel}><summary>Soạn báo cáo đến hiện tại / theo kỳ</summary><form className={styles.form} onSubmit={e => { e.preventDefault(); const body = { periodStart: localInstant(start, "00:00", timezone), periodEnd: new Date(Math.min(Date.now(), Date.parse(localInstant(end, "23:59", timezone)) + 60000)).toISOString() }; void run(async () => { const report = await api<Report>(`${path}/coordinator-reports`, "POST", body, requestKey(attempt, body)); selectedId.current = report.id; }); }}><div className={styles.two}><label>Từ ngày ({timezone})<input type="date" required value={start} onChange={e => setStart(e.target.value)}/></label><label>Đến hết ngày (cắt tại hiện tại)<input type="date" required value={end} max={new Date().toISOString().slice(0, 10)} onChange={e => setEnd(e.target.value)}/></label></div><button className={`${styles.button} ${styles.primary}`} disabled={busy}>Soạn bản nháp báo cáo</button></form></details>}
    <section className={styles.panel}><div className={styles.row}><h2>Báo cáo đã lưu</h2><button className={styles.button} onClick={() => void load().catch(e => setError((e as Error).message))}>Tải lại danh sách</button></div>{!loading && !reports.length && <p>Chưa có báo cáo {leader ? "được tạo" : "được chia sẻ"}.</p>}
      <label>Chọn báo cáo<select className={styles.input} value={selected?.id ?? ""} onChange={e => void load(e.target.value).catch(error => setError((error as Error).message))}><option value="" disabled>Chọn bản báo cáo</option>{reports.map(r => <option key={r.id} value={r.id}>{r.trigger} · {new Date(r.createdAt).toLocaleString("vi-VN")} · {r.status}</option>)}</select></label>
      {selected && <><h3>{selected.trigger === "meeting" ? "Chuẩn bị cuộc họp" : selected.trigger === "weekly" ? "Báo cáo tuần" : "Báo cáo theo kỳ"} <span className={styles.badge}>{selected.status}</span></h3><p className={styles.muted}>Kỳ [{selected.periodStart}, {selected.periodEnd ?? "chốt tại mốc chụp"})<br />Mốc chụp: {selected.asOf ?? "Chưa chụp"} · Múi giờ: {snapshot?.timezone ?? timezone}<br />Diễn giải: {selected.aiMode ?? "Chưa tạo được diễn giải AI"} · Phiên bản {selected.version}</p>
        {selected.status === "queued" || selected.status === "generating" ? <p role="status">Đang chờ xử lý. Bản nguồn và số liệu được lưu trước khi AI soạn nội dung.</p> : null}
        {metrics && <><div className="tf-three">{[["Đã nghiệm thu / tổng task", `${(metrics.statusCounts as Record<string, number>).done} / ${Object.values(metrics.statusCounts as Record<string, number>).reduce((n, v) => n + v, 0)}`], ["Task được nộp trong kỳ", metrics.submittedTaskCount], ["Task nghiệm thu trong kỳ", metrics.acceptedTaskCount]].map(([label, value]) => <div className={styles.item} key={String(label)}><strong>{String(value)}</strong><p>{String(label)}</p></div>)}</div><p className={styles.muted}>Nộp đúng hạn: {String(metrics.submittedOnTimeTotal)} · Nghiệm thu đúng hạn: {String(metrics.acceptedOnTimeTotal)} (task đến hạn trong kỳ). {String(metrics.historyCoverage)}</p>
        <table className={styles.table}><caption>Cập nhật của thành viên · không phải bảng xếp hạng</caption><thead><tr><th>Thành viên</th><th>Việc tự báo</th><th>Nộp / nghiệm thu</th><th>Phút tự khai</th><th>Check-in</th><th>Trở ngại & nguồn</th></tr></thead><tbody>{rollup.map(member => <tr key={member.id}><td>{member.name}<br /><small>{member.lastUpdate ? new Date(member.lastUpdate).toLocaleString("vi-VN") : "Chưa có dữ liệu trong kỳ"}</small></td><td>{member.selfReportedWork.map(w => <p key={w.id}>{w.text}{w.taskId && <><br /><Link href={`/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(w.taskId)}`}>Bản task hiện tại</Link></>}</p>)}</td><td>{member.submittedTasks} / {member.acceptedTasks}</td><td>{member.selfReportedMinutes ?? "Chưa ghi nhận"}{member.unknownDurationItems > 0 && <small> · {member.unknownDurationItems} mục chưa có phút</small>}</td><td>{member.submittedCheckins} bản gửi · {member.expectedCheckins} lượt yêu cầu</td><td>{member.blockers.map(b => <p key={b.revisionId}>{b.text}</p>)}{member.sourceRefs.map(ref => <button className={styles.button} key={ref.id} onClick={() => void showSource(ref)}>Nguồn check-in</button>)}</td></tr>)}</tbody></table></>}
        <h3>Nhận định có nguồn</h3>{selected.summary?.map((item, index) => <div className={styles.item} key={index}><p>{item.text}</p><div className={styles.row}>{item.sourceRefs.map(ref => <button className={styles.button} key={`${ref.entity}:${ref.id}`} onClick={() => void showSource(ref)}>{ref.entity} · {ref.id.slice(0, 8)}</button>)}{item.metricKeys.map(key => <span className={styles.badge} key={key}>{key}</span>)}</div></div>)}
        {leader && selected.status === "draft" && <><details><summary>Sửa diễn giải (giữ số liệu & nguồn)</summary><form className={styles.form} onSubmit={e => { e.preventDefault(); const body = { expectedVersion: selected.version, summary }; void run(() => api(`/api/coordinator-reports/${selected.id}`, "PATCH", body, requestKey(attempt, body))); }}>{summary.map((item, i) => <label key={i}>Nhận định {i + 1}<textarea value={item.text} maxLength={4000} onChange={e => setSummary(summary.map((s, j) => i === j ? { ...s, text: e.target.value } : s))}/></label>)}<button className={styles.button} disabled={busy}>Lưu phiên bản diễn giải</button></form></details><button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => {
                    if (!window.confirm("Chia sẻ đúng phiên bản báo cáo này với toàn bộ thành viên dự án?"))
                        return;
                    const body = { expectedVersion: selected.version };
                    void run(() => api(`/api/coordinator-reports/${selected.id}/publish`, "POST", body, requestKey(attempt, body)));
                }}>Chia sẻ với nhóm</button></>}
        {leader && ["failed", "attention"].includes(selected.status) && <button className={styles.button} disabled={busy} onClick={() => void run(() => api(`/api/coordinator-reports/${selected.id}/retry`, "POST", {}, requestKey(attempt, { id: selected.id, retry: true })))}>Thử lại với nguồn đã chụp</button>}
        {snapshot && <details><summary>Nguồn tại mốc chụp ({snapshot.sources.length})</summary><div className={styles.row}>{snapshot.sources.map(ref => <button className={styles.button} key={`${ref.entity}:${ref.id}`} onClick={() => void showSource(ref)}>{ref.entity} · {ref.id.slice(0, 8)}</button>)}</div></details>}
      </>}
    </section>
    {leader && <MeetingPanel projectId={projectId} timezone={timezone}/>}
    <details className={styles.panel}><summary>Báo cáo cũ (V1, tạo thủ công)</summary><WeeklyReportView projectId={projectId}/></details>
    <dialog className={styles.dialog} ref={dialog} aria-labelledby="frozen-source-title" onClose={() => setSource(null)}><button className={styles.button} onClick={() => dialog.current?.close()}>Đóng nguồn ×</button><h2 id="frozen-source-title">Nguồn tại mốc chụp</h2>{source && <><p>{source.entity} · {source.asOf}</p><FrozenSourceView data={source.data}/></>}</dialog>
  </main>;
}
function FrozenSourceView({ data }: {
    data: Record<string, unknown>;
}) {
    const payload = data.payload as {
        completedWork?: {
            id: string;
            text: string;
            durationMinutes: number | null;
        }[];
        plannedWork?: string;
        blockers?: string;
        nextActions?: string;
    } | undefined;
    return <div>{["title", "description", "content", "note", "status", "occurredAt", "submittedAt"].filter(key => typeof data[key] === "string").map(key => <p key={key}><strong>{key}: </strong>{String(data[key])}</p>)}{payload && <><p>Kế hoạch: {payload.plannedWork}</p>{payload.completedWork?.map(w => <p key={w.id}>{w.text} · {w.durationMinutes ?? "Chưa ghi nhận"} phút tự khai</p>)}<p>Trở ngại: {payload.blockers || "Chưa ghi nhận"}</p><p>Tiếp theo: {payload.nextActions}</p></>}{Array.isArray(data.criteria) && <ul>{(data.criteria as {
                id: string;
                text: string;
            }[]).map(c => <li key={c.id}>{c.id}: {c.text}</li>)}</ul>}{data.after && typeof data.after === "object" ? <p>Trạng thái sau sự kiện: {String((data.after as Record<string, unknown>).status)}</p> : null}</div>;
}
function MeetingPanel({ projectId, timezone }: {
    projectId: string;
    timezone: string;
}) {
    const [meetings, setMeetings] = useState<Meetings>([]), [title, setTitle] = useState(""), [starts, setStarts] = useState(""), [zone, setZone] = useState(timezone), [minutes, setMinutes] = useState(30), [mode, setMode] = useState("week"), [periodStart, setPeriodStart] = useState(""), [prepareNow, setPrepareNow] = useState(false), [editing, setEditing] = useState<Meetings[number] | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const path = `/api/projects/${encodeURIComponent(projectId)}/meetings`, attempt = useRef<{
        input: string;
        key: string;
    } | null>(null);
    useEffect(() => { void api<Meetings>(path).then(setMeetings).catch(e => setError((e as Error).message)); }, [path]);
    async function save(canceled = false, meeting = editing) {
        setBusy(true);
        setError("");
        try {
            const body = canceled && meeting ? { title: meeting.title, startsAt: meeting.startsAt, timezone: meeting.timezone, leadMinutes: meeting.leadMinutes, periodMode: meeting.periodMode, periodStart: meeting.periodStart, canceled: true, prepareNow: false, expectedVersion: meeting.version } : { title, startsAt: localInstant(starts.slice(0, 10), starts.slice(11, 16), zone), timezone: zone, leadMinutes: minutes, periodMode: mode, periodStart: periodStart ? localInstant(periodStart.slice(0, 10), periodStart.slice(11, 16), zone) : null, canceled: false, prepareNow, expectedVersion: meeting?.version ?? 0 };
            await api(`${path}${meeting ? `/${meeting.id}` : ""}`, meeting ? "PATCH" : "POST", body, requestKey(attempt, { ...body, id: meeting?.id }));
            attempt.current = null;
            setMeetings(await api<Meetings>(path));
            setEditing(null);
            setTitle("");
            setStarts("");
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <section className={styles.panel}><h2>Chuẩn bị cuộc họp</h2><p className={styles.muted}>Coordinator chỉ soạn bản nháp trước họp; trưởng nhóm kiểm tra rồi chia sẻ.</p><ul className={styles.items}>{meetings.map(m => <li className={styles.item} key={m.id}>{m.title} · {new Date(m.startsAt).toLocaleString("vi-VN", { timeZone: m.timezone })} ({m.timezone}) · {m.canceledAt ? "Đã hủy" : `Chuẩn bị trước ${m.leadMinutes} phút`}{!m.canceledAt && <div className={styles.row}><button className={styles.button} disabled={busy} onClick={() => { setEditing(m); setTitle(m.title); const p = new Intl.DateTimeFormat("sv-SE", { timeZone: m.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(m.startsAt)); setStarts(p.replace(" ", "T")); setZone(m.timezone); setMinutes(m.leadMinutes); setMode(m.periodMode); setPeriodStart(m.periodStart ? new Intl.DateTimeFormat("sv-SE", { timeZone: m.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(m.periodStart)).replace(" ", "T") : ""); }}>Đổi lịch</button><button className={styles.button} disabled={busy} onClick={() => void save(true, m)}>Hủy cuộc họp</button></div>}</li>)}</ul><details open={!!editing}><summary>{editing ? "Sửa lịch họp" : "Thêm lịch họp"}</summary><form className={styles.form} onSubmit={e => { e.preventDefault(); void save(); }}><label>Tên cuộc họp<input required value={title} maxLength={200} onChange={e => setTitle(e.target.value)}/></label><div className={styles.two}><label>Bắt đầu theo múi giờ đã chọn<input type="datetime-local" required value={starts} onChange={e => setStarts(e.target.value)}/></label><label>Múi giờ<input required value={zone} onChange={e => setZone(e.target.value)}/></label><label>Chuẩn bị trước (phút)<input type="number" required min={5} max={1440} value={minutes} onChange={e => setMinutes(Number(e.target.value))}/></label><label>Kỳ tổng hợp<select value={mode} onChange={e => setMode(e.target.value)}><option value="week">Tuần hiện tại đến mốc chụp</option><option value="since_last_meeting">Từ cuộc họp trước</option><option value="custom">Từ mốc tùy chọn</option></select></label></div>{mode === "custom" && <label>Bắt đầu kỳ<input type="datetime-local" value={periodStart} required onChange={e => setPeriodStart(e.target.value)}/></label>}<label className={styles.check}><input type="checkbox" checked={prepareNow} onChange={e => setPrepareNow(e.target.checked)}/>Soạn ngay (nếu đã qua mốc chuẩn bị)</label><div className={styles.row}><button className={`${styles.button} ${styles.primary}`} disabled={busy}>Lưu lịch họp</button>{editing && <button type="button" className={styles.button} onClick={() => setEditing(null)}>Bỏ sửa</button>}</div></form></details>{error && <p role="alert" className={styles.error}>{error}</p>}</section>;
}
