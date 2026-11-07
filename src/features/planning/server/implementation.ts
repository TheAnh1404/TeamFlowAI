import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createProjectInputSchema, updateProjectInputSchema, addProjectMemberInputSchema, updateProjectMemberInputSchema, updatePlanDraftInputSchema, publishPlanInputSchema, type Plan, type Project, type Task } from "@/contracts";
import { getDb, type Database, type DataConnection, type Transaction } from "@/server/db/client";
import { projects, projectMembers, plans, tasks, users } from "@/server/db/schema";
import { projectMember } from "@/server/auth/access";
import type { Session } from "@/server/auth/contracts";
import { assert, conflict, notFound } from "@/server/http/errors";
import { commitMutation, mutationIdentity } from "@/server/db/mutations";
import { draftProblems } from "../validation";
import { createPlanner } from "./planner";
import type { PlanningService } from "./service";
import {withUserAiSettings} from "@/features/ai-settings/server/service";
async function access(db: DataConnection, session: Session, id: string, leader = false) {
    const member = await projectMember(db, session, id);
    assert(!leader || member.role === "leader", 403, "FORBIDDEN", "Chỉ trưởng nhóm được thay đổi kế hoạch.");
    return member;
}
async function details(db: DataConnection, id: string) {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project)
        throw notFound();
    return { project, members: await db.select().from(projectMembers).where(eq(projectMembers.projectId, id)).orderBy(projectMembers.id) };
}
async function lockProject(tx: Transaction, id: string) { await tx.select().from(projects).where(eq(projects.id, id)).for("update"); }
async function noPlan(tx: Transaction, id: string) { assert(!(await tx.select().from(plans).where(eq(plans.projectId, id))).length, 409, "INVALID_TRANSITION", "Dự án đã có kế hoạch; thông tin đầu vào được khóa."); }
function validateProject(p: Project | Omit<Project, "id" | "createdAt">) {
    assert(p.name.trim() && p.name.length <= 200 && p.goal.trim() && p.goal.length <= 4000 && p.deliverables.length > 0 && p.deliverables.length <= 20 && p.deliverables.every(d => d.trim() && d.length <= 500), 422, "VALIDATION_ERROR", "Nhập tên, mục tiêu và 1–20 đầu ra hợp lệ.");
    assert(Date.parse(p.deadline) > Date.now(), 422, "VALIDATION_ERROR", "Hạn dự án phải ở tương lai.");
    try {
        new Intl.DateTimeFormat("vi", { timeZone: p.timeZone });
    }
    catch {
        assert(false, 422, "VALIDATION_ERROR", "Múi giờ không hợp lệ.");
    }
}
function validateMember(m: {
    skills?: string[];
    availableHoursPerWeek?: number;
}) {
    assert(m.skills === undefined || (m.skills.length <= 20 && m.skills.every(s => s.trim() && s.length <= 100)), 422, "VALIDATION_ERROR", "Kỹ năng không hợp lệ.");
    assert(m.availableHoursPerWeek === undefined || (m.availableHoursPerWeek >= 0 && m.availableHoursPerWeek <= 168), 422, "VALIDATION_ERROR", "Giờ khả dụng phải từ 0 đến 168.");
}
export function createPlanningService(db: Database, planner = createPlanner()): PlanningService {
    return {
        async createProject(session, raw) {
            const input = createProjectInputSchema.parse(raw);
            validateProject(input);
            return db.transaction(async (tx) => {
                const project = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
                const member = { id: randomUUID(), projectId: project.id, userId: session.user.id, role: "leader" as const, canAccept: true, skills: [], availableHoursPerWeek: 0 };
                await tx.insert(projects).values(project);
                await tx.insert(projectMembers).values(member);
                return { project, member };
            });
        },
        async getProject(s, id) { await access(db, s, id); return details(db, id); },
        async updateProject(s, id, raw) {
            const input = updateProjectInputSchema.parse(raw);
            return db.transaction(async (tx) => { await lockProject(tx, id); await access(tx, s, id, true); await noPlan(tx, id); const { project } = await details(tx, id); const next = { ...project, ...input }; validateProject(next); await tx.update(projects).set(input).where(eq(projects.id, id)); return next; });
        },
        async addProjectMember(s, id, raw) {
            const input = addProjectMemberInputSchema.parse(raw);
            validateMember(input);
            return db.transaction(async (tx) => {
                await lockProject(tx, id);
                await access(tx, s, id, true);
                await noPlan(tx, id);
                assert((await tx.select().from(users).where(eq(users.id, input.userId))).length, 422, "VALIDATION_ERROR", "Tài khoản không tồn tại.");
                const { members } = await details(tx, id);
                assert(!members.some(m => m.userId === input.userId), 409, "MEMBER_EXISTS", "Thành viên đã có trong dự án.");
                assert(members.length < 8, 422, "VALIDATION_ERROR", "Dự án tối đa 8 thành viên.");
                const member = { ...input, id: randomUUID(), projectId: id, role: "member" as const };
                await tx.insert(projectMembers).values(member);
                return member;
            });
        },
        async updateProjectMember(s, id, mid, raw) {
            const input = updateProjectMemberInputSchema.parse(raw);
            validateMember(input);
            return db.transaction(async (tx) => { await lockProject(tx, id); await access(tx, s, id, true); await noPlan(tx, id); const { members } = await details(tx, id); const member = members.find(m => m.id === mid); if (!member)
                throw notFound(); assert(member.role !== "leader" || input.canAccept !== false, 422, "VALIDATION_ERROR", "Trưởng nhóm luôn có quyền nghiệm thu."); const next = { ...member, ...input }; await tx.update(projectMembers).set(input).where(eq(projectMembers.id, mid)); return next; });
        },
        async getPlan(s, id) { const member = await access(db, s, id); const [plan] = await db.select().from(plans).where(eq(plans.projectId, id)); assert(!plan || plan.status === "published" || member.role === "leader", 403, "FORBIDDEN", "Bản nháp chỉ dành cho trưởng nhóm."); return plan ?? null; },
        async generatePlanDraft(s, id) {
            await access(db, s, id, true);
            const snapshot = await db.transaction(async (tx) => { await lockProject(tx, id); await noPlan(tx, id); return details(tx, id); });
            validateProject(snapshot.project);
            assert(snapshot.members.every(m => m.skills.length && m.availableHoursPerWeek > 0), 422, "VALIDATION_ERROR", "Bổ sung kỹ năng và giờ khả dụng cho mọi thành viên.");
            const result = await withUserAiSettings(db,s,()=>planner(snapshot));
            const proposals = result.proposal.tasks;
            const keys = new Map(proposals.map(t => [t.tempKey, randomUUID()]));
            assert(keys.size === proposals.length, 502, "AI_INVALID_OUTPUT", "Planner trả khóa công việc trùng.");
            const draftTasks = proposals.map(({tempKey, criteria, dependencyTempKeys, ...t}) => ({ ...t, id: keys.get(tempKey)!, criteria: criteria.map(text => ({ id: randomUUID(), text })), dependencyTaskIds: dependencyTempKeys.map(k => keys.get(k) ?? "invalid") }));
            assert(!draftProblems(draftTasks, snapshot.project, snapshot.members).length, 502, "AI_INVALID_OUTPUT", "Planner trả công việc hoặc phụ thuộc không hợp lệ.");
            return db.transaction(async (tx) => { await lockProject(tx, id); await access(tx, s, id, true); await noPlan(tx, id); assert(JSON.stringify(await details(tx, id)) === JSON.stringify(snapshot), 409, "VERSION_CONFLICT", "Đầu vào đã thay đổi; hãy tạo nháp lại."); const plan: Plan = { id: randomUUID(), projectId: id, status: "draft", version: 1, draftTasks, aiMode: result.aiMode, approvedByMemberId: null, publishedAt: null, createdAt: new Date().toISOString() }; await tx.insert(plans).values(plan); return plan; });
        },
        async updatePlanDraft(s, id, raw) {
            const input = updatePlanDraftInputSchema.parse(raw);
            return db.transaction(async (tx) => {
                const [plan] = await tx.select().from(plans).where(eq(plans.id, id)).for("update");
                if (!plan)
                    throw notFound();
                await access(tx, s, plan.projectId, true);
                assert(plan.status === "draft", 409, "INVALID_TRANSITION", "Kế hoạch đã công bố được khóa.");
                if (plan.version !== input.expectedVersion)
                    throw conflict();
                const draftTasks = input.draftTasks.map(t => { const old = t.id ? plan.draftTasks.find(o => o.id === t.id) : undefined; assert(!t.id || old, 422, "VALIDATION_ERROR", "ID công việc không thuộc bản nháp."); return { ...t, id: t.id ?? randomUUID(), criteria: t.criteria.map(c => { assert(!c.id || old?.criteria.some(o => o.id === c.id), 422, "VALIDATION_ERROR", "ID tiêu chí không thuộc công việc."); return { ...c, id: c.id ?? randomUUID() }; }) }; });
                const d = await details(tx, plan.projectId);
                const errors = draftProblems(draftTasks, d.project, d.members);
                assert(!errors.length, 422, "VALIDATION_ERROR", errors.join(" "));
                const next = { ...plan, draftTasks, version: plan.version + 1 };
                await tx.update(plans).set(next).where(eq(plans.id, id));
                return next;
            });
        },
        async publishPlan(s, id, raw, options) {
            const input = publishPlanInputSchema.parse(raw);
            const [existing] = await db.select().from(plans).where(eq(plans.id, id));
            if (!existing)
                throw notFound();
            await access(db, s, existing.projectId, true);
            const identity = mutationIdentity(s.user.id, `POST /api/plans/${id}/publish`, options.idempotencyKey, input);
            return commitMutation(db, identity, async (tx) => {
                const [plan] = await tx.select().from(plans).where(eq(plans.id, id)).for("update");
                const actor = await access(tx, s, plan.projectId, true);
                assert(input.approved, 422, "VALIDATION_ERROR", "Trưởng nhóm cần xác nhận duyệt kế hoạch.");
                assert(plan.status === "draft", 409, "INVALID_TRANSITION", "Kế hoạch đã được công bố; mở bảng công việc.");
                if (plan.version !== input.expectedVersion)
                    throw conflict();
                const d = await details(tx, plan.projectId);
                const errors = draftProblems(plan.draftTasks, d.project, d.members);
                assert(!errors.length, 422, "VALIDATION_ERROR", errors.join(" "));
                const now = new Date().toISOString();
                const next: Plan = { ...plan, status: "published", version: plan.version + 1, approvedByMemberId: actor.id, publishedAt: now };
                const official: Task[] = plan.draftTasks.map(t => ({ ...t, projectId: plan.projectId, planId: id, status: "todo", version: 1, acceptedSubmissionId: null, acceptedByMemberId: null, acceptedAt: null, createdAt: now }));
                await tx.update(plans).set(next).where(eq(plans.id, id));
                await tx.insert(tasks).values(official);
                return { plan: next, tasks: official };
            });
        },
    };
}
export const planningService = () => createPlanningService(getDb());
