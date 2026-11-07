import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db/client";
import type { Session } from "../src/server/auth/contracts";
import { seedDemoUsers } from "../src/server/db/seed";
import { createPlanningService } from "../src/features/planning/server/implementation";
import { createPlanner } from "../src/features/planning/server/planner";
import { HttpError } from "../src/server/http/errors";
import { eq } from "drizzle-orm";
import { aiProvider } from "../src/server/ai";
import { createTrackingService } from "../src/features/tracking/server/implementation";
const pg = new PGlite(), db = drizzle(pg, { schema }) as unknown as Database;
let leader: Session, member: Session;
const service = createPlanningService(db, createPlanner(undefined, "mock"));
const input = { name: "Planning test", goal: "Build demo", deliverables: ["Demo", "Guide"], deadline: new Date(Date.now() + 86400000).toISOString(), timeZone: "Asia/Ho_Chi_Minh" };
const code = (value: string) => (e: unknown) => e instanceof HttpError && e.code === value;
before(async () => {
    const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
    for (const e of journal.entries)
        await pg.exec(await readFile(`drizzle/${e.tag}.sql`, "utf8"));
    await seedDemoUsers(db);
    const users = await db.select().from(schema.users);
    leader = { user: users.find(u => u.id === "demo-tv1")!, memberships: [] };
    member = { user: users.find(u => u.id === "demo-tv2")!, memberships: [] };
});
after(async () => { await pg.close(); });
test("shared TV3 Planner publishes tasks read by the TV2 workspace", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
        const project = await setup();
        const integrated = createPlanningService(db, createPlanner(aiProvider, ""));
        const plan = await integrated.generatePlanDraft(leader, project.id);
        assert.equal(plan.aiMode, "mock");
        const published = await integrated.publishPlan(leader, plan.id, {expectedVersion:plan.version,approved:true}, {idempotencyKey:crypto.randomUUID()});
        const visible = await createTrackingService(db).listTasks(member, project.id);
        assert.deepEqual(visible.map(t=>t.id).sort(), published.tasks.map(t=>t.id).sort());
        assert(visible.every(t=>t.status === "todo"));
    } finally {
        if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
        else process.env.OPENAI_API_KEY = previousKey;
    }
});
async function setup() { const { project, member: m } = await service.createProject(leader, input); await service.updateProjectMember(leader, project.id, m.id, { skills: ["UI"], availableHoursPerWeek: 10 }); await service.addProjectMember(leader, project.id, { userId: member.user.id, skills: ["API"], availableHoursPerWeek: 10, canAccept: false }); return project; }
test("draft remains private; versioned edits preserve IDs; publish is atomic, approved and retry-safe", async () => {
    const p = await setup(), plan = await service.generatePlanDraft(leader, p.id);
    assert.equal(plan.aiMode, "mock");
    assert.equal((await db.select().from(schema.tasks).where(eq(schema.tasks.projectId, p.id))).length, 0);
    await assert.rejects(service.getPlan(member, p.id), code("FORBIDDEN"));
    await assert.rejects(service.publishPlan(member, plan.id, { expectedVersion: 1, approved: true }, { idempotencyKey: "publish-key" }), code("FORBIDDEN"));
    await assert.rejects(service.publishPlan(leader, plan.id, { expectedVersion: 1, approved: false }, { idempotencyKey: "publish-key" }), code("VALIDATION_ERROR"));
    const edited = await service.updatePlanDraft(leader, plan.id, { expectedVersion: 1, draftTasks: plan.draftTasks.map(t => ({ ...t, title: t.title + " edited" })) });
    assert.equal(edited.draftTasks[0].id, plan.draftTasks[0].id);
    assert.equal(edited.draftTasks[0].criteria[0].id, plan.draftTasks[0].criteria[0].id);
    await assert.rejects(service.updatePlanDraft(leader, plan.id, { expectedVersion: 1, draftTasks: plan.draftTasks }), code("VERSION_CONFLICT"));
    const request = { expectedVersion: edited.version, approved: true }, options = { idempotencyKey: "publish-key" };
    const published = await service.publishPlan(leader, plan.id, request, options);
    assert.deepEqual(await service.publishPlan(leader, plan.id, request, options), published);
    assert.equal((await db.select().from(schema.tasks).where(eq(schema.tasks.projectId, p.id))).length, 2);
    await assert.rejects(service.publishPlan(leader, plan.id, request, { idempotencyKey: "another-key" }), code("INVALID_TRANSITION"));
    await assert.rejects(service.updatePlanDraft(leader, plan.id, { expectedVersion: published.plan.version, draftTasks: plan.draftTasks }), code("INVALID_TRANSITION"));
    assert.equal((await service.getPlan(member, p.id))?.status, "published");
});
test("rejects cycles, foreign IDs, invalid members/deadlines and freezes project inputs", async () => {
    const p = await setup(), plan = await service.generatePlanDraft(leader, p.id), a = plan.draftTasks;
    const edit = (draftTasks: typeof a) => service.updatePlanDraft(leader, plan.id, { expectedVersion: 1, draftTasks });
    await assert.rejects(edit(a.map((t, i) => ({ ...t, dependencyTaskIds: [a[1 - i].id] }))), code("VALIDATION_ERROR"));
    await assert.rejects(edit(a.map(t => ({ ...t, assigneeMemberId: "foreign" }))), code("VALIDATION_ERROR"));
    await assert.rejects(edit(a.map(t => ({ ...t, deadline: "2099-01-01T00:00:00Z" }))), code("VALIDATION_ERROR"));
    await assert.rejects(edit(a.map(t => ({ ...t, id: "foreign" }))), code("VALIDATION_ERROR"));
    await assert.rejects(service.updateProject(leader, p.id, { name: "change" }), code("INVALID_TRANSITION"));
    assert.equal((await service.getPlan(leader, p.id))?.version, 1);
});
test("Planner invalid output and timeout do not persist partial plans", async () => {
    const p = await setup();
    const invalid = createPlanningService(db, async () => ({ aiMode: "real", proposal: { tasks: [{ tempKey: "x", title: "Bad", description: "", assigneeMemberId: "foreign", deadline: input.deadline, criteria: ["ok"], dependencyTempKeys: [] }] } }));
    await assert.rejects(invalid.generatePlanDraft(leader, p.id), code("AI_INVALID_OUTPUT"));
    assert.equal(await service.getPlan(leader, p.id), null);
    const timeout = createPlanner({ generate: async () => new Promise(() => { }) }, undefined, 5);
    await assert.rejects(timeout({ project: p, members: [] }), code("AI_TIMEOUT"));
});
