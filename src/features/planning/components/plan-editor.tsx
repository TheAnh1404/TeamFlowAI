"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { planSchema, taskSchema, type Plan, type ProjectDetails, type User, type DraftTask } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes, routes } from "@/lib/routes";
import { Alert, Badge, Button } from "@/components/ui/primitives";
import { draftProblems } from "../validation";
import { useUnsavedChanges } from "./use-unsaved-changes";
const api = apiRoutes.planning;
export function PlanEditor({ details, initialPlan, users, leader }: {
    details: ProjectDetails;
    initialPlan: Plan | null;
    users: User[];
    leader: boolean;
}) {
    const router = useRouter(), dialog = useRef<HTMLDialogElement>(null), publishKey = useRef("");
    const [plan, setPlan] = useState(initialPlan), [draft, setDraft] = useState(initialPlan?.draftTasks ?? []), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
    const dirty = JSON.stringify(draft) !== JSON.stringify(plan?.draftTasks ?? []);
    const problems = draftProblems(draft, details.project, details.members);
    const editable = leader && plan?.status === "draft";
    useUnsavedChanges(dirty && !busy);
    const memberName = (id: string) => { const m = details.members.find(m => m.id === id); return users.find(u => u.id === m?.userId)?.displayName ?? id; };
    function change(id: string, p: Partial<DraftTask>) { setDraft(ds => ds.map(t => t.id === id ? { ...t, ...p } : t)); setNotice(""); }
    async function action(kind: "generate" | "save" | "publish") {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            if (kind === "generate") {
                const p = (await apiFetch(api.plan(details.project.id), planSchema, { method: "POST" })).data;
                setPlan(p);
                setDraft(p.draftTasks);
            }
            if (kind === "save" && plan) {
                const p = (await apiFetch(api.draft(plan.id), planSchema, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: plan.version, draftTasks: draft }) })).data;
                setPlan(p);
                setDraft(p.draftTasks);
                publishKey.current = "";
                setNotice("Đã lưu bản nháp.");
            }
            if (kind === "publish" && plan) {
                publishKey.current ||= crypto.randomUUID();
                await apiFetch(api.publish(plan.id), z.object({ plan: planSchema, tasks: z.array(taskSchema) }), { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": publishKey.current }, body: JSON.stringify({ expectedVersion: plan.version, approved: true }) });
                router.push(routes.tasks(details.project.id));
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Yêu cầu chưa thành công.");
        }
        finally {
            setBusy(false);
        }
    }
    async function reload() { if (dirty && !window.confirm("Tải bản mới sẽ bỏ các thay đổi chưa lưu. Tiếp tục?"))
        return; setBusy(true); try {
        const p = (await apiFetch(api.plan(details.project.id), planSchema.nullable())).data;
        setPlan(p);
        setDraft(p?.draftTasks ?? []);
        publishKey.current = "";
        setError("");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Chưa tải được dữ liệu.");
    }
    finally {
        setBusy(false);
    } }
    return <main className="tf-page"><Link href="/app">← Dự án của tôi</Link><div className="tf-row"><div><p className="tf-eyebrow">KẾ HOẠCH DỰ ÁN</p><h1>{details.project.name}</h1></div>{plan && <Badge>{plan.status === "draft" ? "Bản nháp — Chỉ trưởng nhóm xem" : "Đã công bố"} · {plan.aiMode === "mock" ? "Dữ liệu mẫu · mock" : "AI thật · real"}</Badge>}</div><nav className="tf-tabs" aria-label="Điều hướng dự án">{[["Công việc", routes.tasks], ["Kế hoạch", routes.plan], ["Chat", routes.chat], ["Báo cáo", routes.reports]].map(([label, fn]) => <Link key={String(label)} href={(fn as typeof routes.plan)(details.project.id)} aria-current={label === "Kế hoạch" ? "page" : undefined}>{String(label)}</Link>)}</nav><p>{details.project.goal}</p><p>Hạn dự án: {new Date(details.project.deadline).toLocaleString("vi-VN", { timeZone: details.project.timeZone })} · {details.project.timeZone}</p>{error && <Alert>{error} <Button className="secondary" disabled={busy} onClick={() => void reload()}>Tải bản mới</Button></Alert>}{notice && <p role="status">{notice}</p>}
 {!plan ? <section className="tf-card"><h2>Chưa có kế hoạch</h2><p>Kiểm tra thông tin và thành viên trước khi tạo nháp.</p>{leader && <Button disabled={busy} onClick={() => void action("generate")}>{busy ? "Đang tạo nháp…" : "Tạo kế hoạch nháp"}</Button>}</section> : <><div className="tf-row"><h2>{draft.length} công việc {editable ? "đề xuất" : "đã công bố"}</h2><span className="tf-muted">Phiên bản {plan.version}{dirty ? " · Chưa lưu" : ""}</span></div>{draft.map((t, i) => <section className="tf-card" key={t.id}><h3>Công việc {i + 1}</h3><fieldset disabled={!editable || busy}><label>Tên công việc<input maxLength={200} value={t.title} onChange={e => change(t.id, { title: e.target.value })}/></label><label>Mô tả<textarea aria-label="Mô tả" maxLength={4000} value={t.description} onChange={e => change(t.id, { description: e.target.value })}/></label><div className="tf-two"><label>Người phụ trách<select value={t.assigneeMemberId} onChange={e => change(t.id, { assigneeMemberId: e.target.value })}>{details.members.map(m => <option key={m.id} value={m.id}>{memberName(m.id)}</option>)}</select></label><label>Hạn chót · giờ Việt Nam<input type="datetime-local" value={new Date(Date.parse(t.deadline) + 7 * 3600000).toISOString().slice(0, 16)} onChange={e => { if (e.target.value)
        change(t.id, { deadline: new Date(e.target.value + ":00+07:00").toISOString() }); }}/></label></div><h4>Tiêu chí nghiệm thu</h4>{t.criteria.map((c, n) => <label key={c.id}>Tiêu chí {n + 1}<textarea maxLength={1000} value={c.text} onChange={e => change(t.id, { criteria: t.criteria.map(x => x.id === c.id ? { ...x, text: e.target.value } : x) })}/></label>)}<h4>Phụ thuộc công việc</h4>{draft.filter(d => d.id !== t.id).map(d => <label className="tf-check" key={d.id}><input type="checkbox" checked={t.dependencyTaskIds.includes(d.id)} onChange={e => change(t.id, { dependencyTaskIds: e.target.checked ? [...t.dependencyTaskIds, d.id] : t.dependencyTaskIds.filter(id => id !== d.id) })}/>{d.title}</label>)}</fieldset></section>)}{editable && <><p>Planner đề xuất nội dung. Trưởng nhóm cần xác nhận độ phù hợp với giờ khả dụng: {details.members.map(m => `${memberName(m.id)}: ${m.availableHoursPerWeek} giờ/tuần`).join(" · ")}.</p>{problems.length > 0 && <Alert>{problems.join(" ")}</Alert>}<div className="tf-actions"><Button className="secondary" disabled={busy || !dirty || !!problems.length} onClick={() => void action("save")}>Lưu bản nháp</Button><Button disabled={busy || dirty || !!problems.length} onClick={() => dialog.current?.showModal()}>Duyệt và công bố kế hoạch</Button></div>{dirty && <p>Lưu các chỉnh sửa trước khi công bố.</p>}</>}{plan.status === "published" && <Link className="tf-button" href={routes.tasks(details.project.id)}>Mở bảng công việc →</Link>}</>}
 <dialog ref={dialog} aria-labelledby="publish-title"><h2 id="publish-title">Công bố kế hoạch?</h2><p>{draft.length} công việc sẽ được giao cho {new Set(draft.map(t => t.assigneeMemberId)).size} thành viên. Nội dung kế hoạch sẽ được khóa.</p><div className="tf-actions"><Button className="secondary" autoFocus disabled={busy} onClick={() => dialog.current?.close()}>Quay lại kiểm tra</Button><Button disabled={busy} onClick={() => { dialog.current?.close(); void action("publish"); }}>Xác nhận duyệt và công bố</Button></div></dialog>{busy && <p role="status">Đang xử lý, vui lòng chờ…</p>}</main>;
}
