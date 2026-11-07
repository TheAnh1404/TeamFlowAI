"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultNotificationPreference, defaultSchedule, type NotificationPreference, type Schedule } from "@/contracts/coordinator";
import type { WorkspaceData } from "../model";
import type { createCoordinatorService } from "../server/coordinator-service";
import { coordinatorRequest as api } from "./coordinator-client";
import { requestKey } from "./client-data";
import styles from "./coordinator.module.css";
type Settings = Awaited<ReturnType<ReturnType<typeof createCoordinatorService>["settings"]>>;
export function CoordinatorSettings({ data }: {
    data: WorkspaceData;
}) {
    const [state, setState] = useState<Settings | null>(null), [schedule, setSchedule] = useState<Schedule>(defaultSchedule), [preferences, setPreferences] = useState<NotificationPreference>(defaultNotificationPreference), [verified, setVerified] = useState(false), [suppressed, setSuppressed] = useState(false), [participation, setParticipation] = useState(true), [pausedDates, setPausedDates] = useState(""), [error, setError] = useState(""), [status, setStatus] = useState(""), [busy, setBusy] = useState(false);
    const attempt = useRef<{
        input: string;
        key: string;
    } | null>(null), path = `/api/projects/${encodeURIComponent(data.project.id)}`;
    const load = useCallback(async () => {
        const [s, p, m] = await Promise.all([api<Settings>(`${path}/coordinator-settings`), api<{
                preferences: NotificationPreference;
                emailVerified: boolean;
                suppressed: boolean;
            }>("/api/notification-preferences"), api<{
                participation: boolean;
                pausedDates: string[];
            }>(`${path}/checkin-preferences/me`)]);
        setState(s);
        setSchedule(s.settings);
        setPreferences(p.preferences);
        setVerified(p.emailVerified);
        setSuppressed(p.suppressed);
        setParticipation(m.participation);
        setPausedDates(m.pausedDates.join(", "));
    }, [path]);
    useEffect(() => {
        let active = true;
        Promise.resolve().then(() => {
            if (active)
                return load();
        }).catch(e => {
            if (active)
                setError((e as Error).message);
        });
        return () => { active = false; };
    }, [load]);
    async function execute(action: () => Promise<unknown>, message: string) {
        setBusy(true);
        setError("");
        setStatus("");
        try {
            await action();
            attempt.current = null;
            setStatus(message);
            await load();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    const leader = data.actor.role === "leader";
    return <section className={styles.panel} id="coordinator-settings"><h2>Lịch & thông báo</h2>
    <p className={styles.muted}>App: sẵn sàng · Chat: sẵn sàng<br />Email: {state?.channels.email === "configured" ? "Đã cấu hình provider" : "Chưa cấu hình provider"} · {verified ? "Đã xác minh địa chỉ" : "Địa chỉ chưa xác minh"}{suppressed ? " · Đang bị chặn do bounce/complaint" : ""}<br />Scheduler: {state?.channels.scheduler === "enabled" ? "Đã cho phép chạy" : "Chưa bật ở môi trường triển khai"}</p>
    <details><summary>Tùy chọn của tôi</summary><form className={styles.form} onSubmit={e => { e.preventDefault(); void execute(async () => { await api("/api/notification-preferences", "PATCH", preferences); await api(`${path}/checkin-preferences/me`, "PATCH", { participation, pausedDates: pausedDates.split(",").map(v => v.trim()).filter(Boolean) }); }, "Đã lưu tùy chọn cá nhân."); }}>
      <label className={styles.check}><input type="checkbox" checked={preferences.emailEnabled} onChange={e => setPreferences({ ...preferences, emailEnabled: e.target.checked })}/>Nhận email nhắc việc</label>
      <label className={styles.check}><input type="checkbox" checked={preferences.reportsEmailEnabled} onChange={e => setPreferences({ ...preferences, reportsEmailEnabled: e.target.checked })}/>Nhận liên kết báo cáo qua email</label>
      <label>Múi giờ cá nhân<input value={preferences.timezone} onChange={e => setPreferences({ ...preferences, timezone: e.target.value })}/></label>
      <div className={styles.two}>{([['morningTime', 'Email sáng'], ['eodTime', 'Email cuối ngày'], ['quietStart', 'Yên lặng từ'], ['quietEnd', 'Yên lặng đến']] as const).map(([key, label]) => <label key={key}>{label}<input type="time" value={preferences[key]} onChange={e => setPreferences({ ...preferences, [key]: e.target.value })}/></label>)}</div>
      <label className={styles.check}><input type="checkbox" checked={participation} onChange={e => setParticipation(e.target.checked)}/>Tham gia check-in dự án</label><label>Ngày tạm nghỉ (YYYY-MM-DD, cách bằng dấu phẩy)<input value={pausedDates} onChange={e => setPausedDates(e.target.value)}/></label>
      <button className={styles.button} disabled={busy}>Lưu tùy chọn</button>
    </form></details>
    {leader && state && <details><summary>Cấu hình Coordinator của dự án</summary><form className={styles.form} onSubmit={e => { e.preventDefault(); const body = { expectedVersion: state.version, settings: schedule }; void execute(() => api(`${path}/coordinator-settings`, "PATCH", body, requestKey(attempt, body)), "Đã lưu lịch. Chỉ các mốc tương lai có hiệu lực."); }}>
      <label className={styles.check}><input type="checkbox" checked={schedule.enabled} onChange={e => setSchedule({ ...schedule, enabled: e.target.checked })}/>Bật automation dự án</label>
      <label>Múi giờ dự án<input value={schedule.timezone} onChange={e => setSchedule({ ...schedule, timezone: e.target.value })}/></label>
      <fieldset><legend>Ngày làm việc</legend><div className={styles.row}>{[1, 2, 3, 4, 5, 6, 7].map(day => <label className={styles.check} key={day}><input type="checkbox" checked={schedule.workdays.includes(day)} onChange={e => setSchedule({ ...schedule, workdays: e.target.checked ? [...schedule.workdays, day] : schedule.workdays.filter(d => d !== day) })}/>{day === 7 ? "CN" : `T${day + 1}`}</label>)}</div></fieldset>
      <div className={styles.two}>{([['morningTime', 'Nhắc sáng'], ['eodTime', 'Nhắc cuối ngày'], ['weeklyTime', 'Soạn báo cáo']] as const).map(([key, label]) => <label key={key}>{label}<input type="time" value={schedule[key]} onChange={e => setSchedule({ ...schedule, [key]: e.target.value })}/></label>)}<label>Nhắc lại (tắt khi trống)<input type="time" value={schedule.repeatTime ?? ""} onChange={e => setSchedule({ ...schedule, repeatTime: e.target.value || null })}/></label></div>
      <label>Kỳ báo cáo<select value={schedule.weeklyMode} onChange={e => setSchedule({ ...schedule, weeklyMode: e.target.value as Schedule["weeklyMode"] })}><option value="friday">Thứ Sáu · tuần đến mốc chụp</option><option value="monday">Thứ Hai · trọn tuần lịch trước</option></select></label>
      <label>Ngày nghỉ dự án (YYYY-MM-DD, dấu phẩy)<input value={schedule.holidays.join(",")} onChange={e => setSchedule({ ...schedule, holidays: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })}/></label>
      <fieldset><legend>Người tham gia (để trống: mọi thành viên đủ điều kiện)</legend>{data.members.map(({ member, user }) => <label className={styles.check} key={member.id}><input type="checkbox" checked={schedule.participantMemberIds.includes(member.id)} onChange={e => setSchedule({ ...schedule, participantMemberIds: e.target.checked ? [...schedule.participantMemberIds, member.id] : schedule.participantMemberIds.filter(id => id !== member.id) })}/>{user.displayName}</label>)}</fieldset>
      {([['appEnabled', 'Thông báo app'], ['chatEnabled', 'Tin chung trong chat'], ['emailEnabled', 'Cho phép email digest']] as const).map(([key, label]) => <label className={styles.check} key={key}><input type="checkbox" checked={schedule[key]} onChange={e => setSchedule({ ...schedule, [key]: e.target.checked })}/>{label}</label>)}
      <p className={styles.muted}>Email còn phụ thuộc opt-in và địa chỉ đã xác minh của từng người. Trước khi bật, kiểm tra các mốc xem trước bên dưới.</p>
      <SchedulePreview schedule={schedule} projectId={data.project.id}/>
      <button className={`${styles.button} ${styles.primary}`} disabled={busy}>Lưu cấu hình lịch</button>
      {state.settings.enabled && <button type="button" className={styles.button} disabled={busy} onClick={() => { const body = { expectedVersion: state.version, settings: { ...state.settings, enabled: false } }; void execute(() => api(`${path}/coordinator-settings`, "PATCH", body, requestKey(attempt, body)), "Đã tạm dừng automation dự án."); }}>Tạm dừng automation</button>}
    </form><p className={styles.muted}>Lần chạy gần nhất: {state.lastRunAt ? new Date(state.lastRunAt).toLocaleString("vi-VN") : "Chưa chạy"}<br />Kiểm tra lịch tiếp theo: {new Date(state.nextRunAt).toLocaleString("vi-VN")}</p><details><summary>Trạng thái tác vụ gần đây</summary><ul className={styles.items}>{state.jobs.map(job => <li className={styles.item} key={job.id}>{job.type} · {job.status}{job.lastErrorCode && <p>{job.lastErrorCode}</p>}{["attention", "expired"].includes(job.status) && <button className={styles.button} disabled={busy} onClick={() => void execute(() => api(`${path}/coordinator-jobs/${job.id}/retry`, "POST", {}, crypto.randomUUID()), "Đã yêu cầu kiểm tra lại job.")}>Thử lại</button>}</li>)}</ul></details></details>}
    {status && <p role="status">{status}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
  </section>;
}
import { occurrences } from "@/server/automation/time";
function SchedulePreview({ schedule, projectId }: {
    schedule: Schedule;
    projectId: string;
}) {
    const [now] = useState(() => new Date().toISOString());
    let preview: ReturnType<typeof occurrences> = [];
    try {
        preview = occurrences(schedule, projectId, now, new Date(Date.parse(now) + 7 * 86400000).toISOString()).slice(0, 6);
    }
    catch {
        return <p role="status">Hoàn thiện múi giờ/ngày/giờ hợp lệ để xem trước.</p>;
    }
    return <details><summary>Xem trước lịch ({schedule.timezone})</summary><ul>{preview.map(o => <li key={o.key}>{new Date(o.scheduledFor).toLocaleString("vi-VN", { timeZone: schedule.timezone })} · {o.slot}</li>)}</ul></details>;
}
