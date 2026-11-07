"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { projectSchema, projectMemberSchema, planSchema, type User, type CreateProjectResult } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes, routes } from "@/lib/routes";
import { Alert, Button, Stepper } from "@/components/ui/primitives";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { intakeResultSchema, type IntakeResult } from "../intake";
const api = apiRoutes.planning;
export function ProjectWizard({ users, actorId }: {
    users: User[];
    actorId: string;
}) {
    const router = useRouter();
    const [step, setStep] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const [name, setName] = useState(""), [goal, setGoal] = useState(""), [outputs, setOutputs] = useState(""), [date, setDate] = useState("");
    const [members, setMembers] = useState(users.map(u => ({ userId: u.id, selected: true, skills: "", hours: 10 })));
    const [created, setCreated] = useState<CreateProjectResult | null>(null);
    const [review,setReview]=useState<IntakeResult|null>(null),[answers,setAnswers]=useState<Record<string,string>>({});
    const deliverables = outputs.split("\n").map(s => s.trim()).filter(Boolean);
    useUnsavedChanges(!!name && !created && !busy);
    function next() { setError(""); if (step === 1 && (!name.trim() || !goal.trim() || !deliverables.length || !date)) {
        setError("Nhập tên, mục tiêu, đầu ra và hạn dự án.");
        return;
    } if (step === 2 && members.some(m => m.selected && (!m.skills.trim() || m.hours <= 0 || m.hours > 168))) {
        setError("Bổ sung kỹ năng và giờ khả dụng cho từng thành viên.");
        return;
    } setStep(step + 1); }
    async function reviewInput(){
        setBusy(true);setError("");
        try { const result=await apiFetch("/api/planning/intake",intakeResultSchema,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project:{name,goal,deliverables,deadline:new Date(date+"T23:59:59+07:00").toISOString(),timeZone:"Asia/Ho_Chi_Minh"},members:members.filter(m=>m.selected).map(m=>({userId:m.userId,skills:m.skills.split(",").map(s=>s.trim()).filter(Boolean),availableHoursPerWeek:m.hours}))})});setReview(result.data); }
        catch(e){setError(e instanceof Error?e.message:"Chưa rà soát được yêu cầu.");}finally{setBusy(false);}
    }
    async function generate() {
        if(!review||review.questions.some(q=>!(answers[q.id]??"").trim())){setError("Hoàn thiện thông tin làm rõ trước khi tạo kế hoạch.");return;}
        const clarifiedGoal=goal+"\n\nThông tin trưởng nhóm đã làm rõ:\n"+review.questions.map(q=>`${q.question}\n${answers[q.id].trim()}`).join("\n\n");
        setBusy(true);
        setError("");
        try {
            let saved = created;
            if (!saved) {
                saved = (await apiFetch(api.projects, z.object({ project: projectSchema, member: projectMemberSchema }), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, goal:clarifiedGoal, deliverables, deadline: new Date(date + "T23:59:59+07:00").toISOString(), timeZone: "Asia/Ho_Chi_Minh" }) })).data;
                setCreated(saved);
            }
            const prior = (await apiFetch(api.plan(saved.project.id), planSchema.nullable())).data;
            if (prior) {
                router.push(routes.plan(saved.project.id));
                return;
            }
            const d = (await apiFetch(api.project(saved.project.id), z.object({ project: projectSchema, members: z.array(projectMemberSchema) }))).data;
            for (const m of members.filter(m => m.selected)) {
                const existing = d.members.find(e => e.userId === m.userId);
                await apiFetch(existing ? api.member(saved.project.id, existing.id) : api.members(saved.project.id), projectMemberSchema, { method: existing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(existing ? {} : { userId: m.userId }), skills: m.skills.split(",").map(s => s.trim()).filter(Boolean), availableHoursPerWeek: m.hours, canAccept: m.userId === actorId }) });
            }
            await apiFetch(api.plan(saved.project.id), planSchema, { method: "POST" });
            router.push(routes.plan(saved.project.id));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Chưa tạo được kế hoạch.");
        }
        finally {
            setBusy(false);
        }
    }
    return <main className="tf-page"><p className="tf-eyebrow">KHỞI ĐẦU CÙNG NHAU</p><h1>Tạo dự án mới</h1><p>Cho Planner hiểu mục tiêu và năng lực của nhóm.</p><Stepper step={step} labels={["Thông tin dự án", "Thành viên", "Xác nhận"]}/>{error && <Alert>{error} {created && <a href={routes.plan(created.project.id)}>Mở dự án đã lưu</a>}</Alert>}<form className="tf-card" onSubmit={e => { e.preventDefault(); if (step < 3)
        next();
    else
        void (review?generate():reviewInput()); }}>
 {step === 1 && <><h2>Nhóm mình sẽ làm gì?</h2><label>Tên dự án<input required maxLength={200} value={name} onChange={e => setName(e.target.value)}/></label><label>Mục tiêu<textarea required maxLength={2500} value={goal} onChange={e => setGoal(e.target.value)}/></label><label>Đầu ra mong muốn · mỗi dòng một đầu ra<textarea required value={outputs} onChange={e => setOutputs(e.target.value)}/></label><label>Hạn dự án · giờ Việt Nam<input required type="date" value={date} onChange={e => setDate(e.target.value)}/></label></>}
 {step === 2 && <><h2>Ai sẽ cùng tham gia?</h2><p>Kỹ năng phân cách bằng dấu phẩy. Giờ khả dụng tính theo tuần.</p>{members.map((m, i) => <fieldset key={m.userId}><legend><label className="tf-check"><input type="checkbox" disabled={m.userId === actorId} checked={m.selected} onChange={e => setMembers(ms => ms.map((v, n) => n === i ? { ...v, selected: e.target.checked } : v))}/>{users.find(u => u.id === m.userId)?.displayName} {m.userId === actorId ? "· Trưởng nhóm" : ""}</label></legend>{m.selected && <div className="tf-two"><label>Kỹ năng<input required value={m.skills} onChange={e => setMembers(ms => ms.map((v, n) => n === i ? { ...v, skills: e.target.value } : v))}/></label><label>Giờ khả dụng / tuần<input required type="number" min="0.5" max="168" step="0.5" value={m.hours} onChange={e => setMembers(ms => ms.map((v, n) => n === i ? { ...v, hours: Number(e.target.value) } : v))}/></label></div>}</fieldset>)}</>}
 {step === 3 && <><h2>Kiểm tra trước khi tạo nháp</h2><h3>{name}</h3><p>{goal}</p><ul>{deliverables.map((d, i) => <li key={i}>{d}</li>)}</ul><p>Hạn: {date} · Asia/Ho_Chi_Minh</p>{members.filter(m => m.selected).map(m => <p key={m.userId}>{users.find(u => u.id === m.userId)?.displayName}: {m.skills} · {m.hours} giờ/tuần</p>)}{review&&<section className="tf-card" aria-label="Làm rõ yêu cầu"><h3>Rà soát yêu cầu trước khi phân việc</h3><p>{review.summary}</p><p className="tf-muted">Câu hỏi hướng dẫn theo cấu trúc yêu cầu; chưa gọi mô hình AI ở bước này.</p>{review.questions.map(q=><label key={q.id}>{q.question}<small>{q.hint}</small><textarea required maxLength={300} disabled={busy||!!created} value={answers[q.id]??""} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}/></label>)}<ul>{review.allocationNotes.map(n=><li key={n}>{n}</li>)}</ul></section>}<p>Planner chỉ tạo bản nháp. Bạn sẽ sửa và duyệt trước khi công bố công việc.</p>{created && <p>Dự án đã lưu. Có thể thử lại khi Planner lỗi.</p>}</>}
 <div className="tf-actions">{step > 1 && <Button className="secondary" type="button" disabled={busy || !!created} onClick={() => {setStep(step - 1);setReview(null);}}>Quay lại</Button>}<Button disabled={busy}>{busy ? "Đang tạo bản nháp…" : step < 3 ? "Tiếp tục →" : review?"Tạo kế hoạch nháp":"Rà soát yêu cầu"}</Button></div>{busy && <p role="status">Đang đọc thông tin và tạo nháp. Vui lòng chờ…</p>}</form></main>;
}
