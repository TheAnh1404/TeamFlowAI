"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { emptyCheckin, type CheckinPayload } from "@/contracts/coordinator";
import type { WorkspaceData } from "../model";
import { requestKey } from "./client-data";
import { coordinatorRequest as api } from "./coordinator-client";
import styles from "./coordinator.module.css";
import type { createCoordinatorService } from "../server/coordinator-service";
type DailyRows = Awaited<ReturnType<ReturnType<typeof createCoordinatorService>["checkins"]>>;
type Sources = Awaited<ReturnType<ReturnType<typeof createCoordinatorService>["checkinSources"]>>;
const dateIn = (zone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const labels: Record<string, string> = { not_requested: "Chưa được yêu cầu", awaiting: "Đang chờ cập nhật", draft: "Bản nháp", submitted: "Đã gửi", paused: "Tạm nghỉ", skipped: "Đã bỏ qua" };
export function DailyCheckin({ data }: {
    data: WorkspaceData;
}) {
    const [date, setDate] = useState(() => dateIn(data.project.timeZone)), [rows, setRows] = useState<DailyRows>([]), [payload, setPayload] = useState<CheckinPayload>(emptyCheckin), [version, setVersion] = useState(0), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [status, setStatus] = useState("");
    const attempt = useRef<{
        input: string;
        key: string;
    } | null>(null), inFlight = useRef(false), generation = useRef(0), latestPayload = useRef(payload);
    useEffect(() => { latestPayload.current = payload; }, [payload]);
    const path = `/api/projects/${encodeURIComponent(data.project.id)}/checkins`;
    const [sources, setSources] = useState<Sources>([]);
    const load = useCallback(async (workDate: string) => {
        const g = ++generation.current;
        try {
            const result = await api<DailyRows>(`${path}?workDate=${workDate}`);
            if (g !== generation.current)
                return;
            setRows(result);
            const mine = result.find(r => r.memberId === data.actor.id)?.checkin;
            setPayload(mine?.draft ?? structuredClone(emptyCheckin));
            setVersion(mine?.version ?? 0);
            setDirty(false);
            setError("");
            setStatus(mine ? "Đã tải bản lưu" : "");
        }
        catch (e) {
            if (g === generation.current)
                setError((e as Error).message);
        }
    }, [path, data.actor.id]);
    useEffect(() => {
        let active = true;
        Promise.resolve().then(() => {
            if (!active)
                return;
            const params = new URLSearchParams(window.location.search);
            const day = params.get("workDate");
            if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
                setDate(day);
                void load(day);
            }
            else
                void load(dateIn(data.project.timeZone));
        });
        return () => { active = false; };
    }, [load, data.project.timeZone]);
    async function save(submit: boolean) {
        if (inFlight.current)
            return;
        inFlight.current = true;
        setBusy(true);
        setError("");
        const sentPayload = payload, sentDate = date, g = generation.current;
        const body = { expectedVersion: version, payload: sentPayload };
        try {
            const saved = await api<{
                version: number;
                warning: string | null;
            }>(`${path}/me/${sentDate}/${submit ? "submit" : "draft"}`, submit ? "POST" : "PUT", body, requestKey(attempt, { ...body, submit, date: sentDate }));
            if (g !== generation.current)
                return;
            setVersion(saved.version);
            if (JSON.stringify(latestPayload.current) === JSON.stringify(sentPayload))
                setDirty(false);
            attempt.current = null;
            setStatus(saved.warning ?? (submit ? "Đã gửi cập nhật; task cần được nghiệm thu riêng." : "Đã lưu bản nháp"));
            const result = await api<DailyRows>(`${path}?workDate=${sentDate}`);
            if (g === generation.current)
                setRows(result);
        }
        catch (e) {
            if (g === generation.current) {
                setError((e as Error).message);
                setStatus("Nội dung vẫn được giữ. Nếu có xung đột, tải bản mới trước khi sửa lại.");
            }
        }
        finally {
            inFlight.current = false;
            setBusy(false);
        }
    }
    useEffect(() => {
        if (!dirty || busy || error)
            return;
        const timer = setTimeout(() => void save(false), 1800);
        return () => clearTimeout(timer);
    });
    useEffect(() => {
        if (!dirty)
            return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);
    function change(next: CheckinPayload) { setPayload(next); setDirty(true); setStatus("Chưa lưu thay đổi"); }
    const name = (id: string) => data.members.find(m => m.member.id === id)?.user.displayName ?? id;
    return <section id="daily-checkin" className={styles.panel} aria-labelledby="daily-heading">
    <h2 id="daily-heading">Cập nhật hôm nay</h2><p className={styles.muted}>Một bản ghi mỗi ngày, có lịch sử phiên bản. Thời gian tự khai được chia sẻ trong dự án; không phải chấm công.</p>
    <div className={styles.form}><label>Ngày làm việc<input type="date" value={date} max={dateIn(data.project.timeZone)} disabled={busy} onChange={e => {
            if (dirty && !window.confirm("Bản đang soạn chưa lưu. Chuyển ngày và bỏ thay đổi?"))
                return;
            setDate(e.target.value);
            void load(e.target.value);
        }}/></label></div>
    <form className={styles.form} onSubmit={e => { e.preventDefault(); void save(true); }} aria-busy={busy}>
      <details><summary>Nguồn của tôi trong ngày</summary><p className={styles.muted}>Chọn nguồn để đưa vào bản nháp và chỉnh lại trước khi gửi. Hệ thống không tự suy số phút.</p><button className={styles.button} type="button" onClick={() => void api<Sources>(`/api/projects/${encodeURIComponent(data.project.id)}/checkin-sources?workDate=${date}`).then(setSources).catch(e => setError((e as Error).message))}>Lấy nguồn chat / cập nhật / bài nộp</button>{sources.map(source => <div className={styles.item} key={`${source.entity}:${source.id}`}><p>{source.text.slice(0, 500)}</p><button className={styles.button} type="button" disabled={payload.completedWork.some(w => w.id === `${source.entity}:${source.id}`)} onClick={() => change({ ...payload, noWorkUpdate: false, completedWork: [...payload.completedWork, { id: `${source.entity}:${source.id}`, text: source.text.slice(0, 2000), taskId: source.taskId, durationMinutes: null }], sourcePostIds: source.entity === "ChatPost" ? [...new Set([...payload.sourcePostIds, source.id])] : payload.sourcePostIds, sourceEvidence: source.entity !== "ChatPost" ? [...payload.sourceEvidence, { entity: source.entity, id: source.id }] : payload.sourceEvidence })}>Dùng nguồn này trong bản nháp</button></div>)}</details>
      <label>Kế hoạch đầu ngày<textarea value={payload.plannedWork} maxLength={4000} onChange={e => change({ ...payload, plannedWork: e.target.value })}/></label>
      <label className={styles.check}><input type="checkbox" checked={payload.noWorkUpdate} onChange={e => change({ ...payload, noWorkUpdate: e.target.checked, completedWork: e.target.checked ? [] : payload.completedWork })}/>Hôm nay chưa có cập nhật công việc</label>
      {payload.completedWork.map((item, index) => <fieldset className={styles.item} key={item.id}><legend>Việc đã làm {index + 1}</legend><label>Kết quả cụ thể<textarea required value={item.text} maxLength={2000} onChange={e => change({ ...payload, completedWork: payload.completedWork.map(w => w.id === item.id ? { ...w, text: e.target.value } : w) })}/></label>
        <div className={styles.two}><label>Công việc liên quan<select value={item.taskId ?? ""} onChange={e => change({ ...payload, completedWork: payload.completedWork.map(w => w.id === item.id ? { ...w, taskId: e.target.value || null } : w) })}><option value="">Hỗ trợ / chưa gắn task</option>{data.tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
        <label>Phút tự khai (không bắt buộc)<input type="number" min={1} max={1440} value={item.durationMinutes ?? ""} onChange={e => change({ ...payload, completedWork: payload.completedWork.map(w => w.id === item.id ? { ...w, durationMinutes: e.target.value ? Number(e.target.value) : null } : w) })}/></label></div>
        <button className={styles.button} type="button" onClick={() => change({ ...payload, completedWork: payload.completedWork.filter(w => w.id !== item.id) })}>Bỏ việc {index + 1}</button></fieldset>)}
      <button className={styles.button} type="button" disabled={payload.noWorkUpdate || payload.completedWork.length >= 30} onClick={() => change({ ...payload, completedWork: [...payload.completedWork, { id: crypto.randomUUID(), text: "", taskId: null, durationMinutes: null }] })}>+ Thêm việc đã làm</button>
      <label>Trở ngại / cần hỗ trợ<textarea maxLength={4000} value={payload.blockers} onChange={e => change({ ...payload, blockers: e.target.value })}/></label>
      <label>Bước tiếp theo<textarea maxLength={4000} value={payload.nextActions} onChange={e => change({ ...payload, nextActions: e.target.value })}/></label>
      <div className={styles.row}><button type="button" className={styles.button} disabled={busy || !dirty} onClick={() => void save(false)}>Lưu nháp</button><button className={`${styles.button} ${styles.primary}`} disabled={busy}>Gửi cập nhật</button><button type="button" className={styles.button} disabled={busy} onClick={() => {
            if (!dirty || window.confirm("Tải bản mới và bỏ thay đổi chưa lưu?"))
                void load(date);
        }}>Tải bản mới</button></div>
      <p role="status" className={styles.muted}>{busy ? "Đang lưu…" : status}</p>{error && <p role="alert" className={styles.error}>{error}</p>}
    </form>
    <details><summary>Nhóm đã cập nhật · {rows.filter(r => r.status === "submitted").length}/{rows.filter(r => r.requested).length} lượt được yêu cầu</summary><ul className={styles.items}>{rows.map(row => <li key={row.memberId} className={styles.item}><strong>{name(row.memberId)}</strong> <span className={styles.badge}>{labels[row.status]}</span>{row.revisions[0] && <><p>{row.revisions[0].payload.completedWork.map(w => w.text).join("; ") || "Chưa có cập nhật công việc"}</p>{row.revisions[0].payload.blockers && <p>Trở ngại: {row.revisions[0].payload.blockers}</p>}<details><summary>Lịch sử ({row.revisions.length} bản gửi)</summary>{row.revisions.map(r => <div className={styles.item} key={r.id}>Bản {r.revision} · {new Date(r.submittedAt).toLocaleString("vi-VN")}<p>{r.payload.completedWork.map(w => w.text).join("; ") || "Chưa có cập nhật công việc"}</p><p>{r.payload.blockers}</p></div>)}</details></>}</li>)}</ul></details>
  </section>;
}
