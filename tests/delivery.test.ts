import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db/client";
import type { Session } from "../src/server/auth/contracts";
import type { AiProvider, ReviewAiInput } from "../src/server/ai/contracts";
import { aiProvider } from "../src/server/ai";
import { createDeliveryService, calculateReportMetrics } from "../src/features/delivery/server/service";
import { createTrackingService } from "../src/features/tracking/server/implementation";
import { HttpError } from "../src/server/http/errors";
import { AiUnavailableError } from "../src/server/ai/errors";
import { handleDeliveryApiError } from "../src/features/delivery/server/api-response";

const pg = new PGlite();
const db = drizzle(pg, { schema }) as unknown as Database;
const now = new Date().toISOString();
const deadline = new Date(Date.now() + 86400000).toISOString();
const user = (id: string): Session => ({ user: { id, displayName: id, createdAt: now }, memberships: [] });
const leader = user("leader"), owner = user("owner"), reviewer = user("reviewer"), outsider = user("outsider");
const key = () => ({ idempotencyKey: crypto.randomUUID() });
const hasCode = (code: string) => (error: unknown) => error instanceof HttpError && error.code === code;
let sequence = 0;
let aiCalls = 0;
const ai = { async generate(kind: string, input: ReviewAiInput) {
  aiCalls++;
  if (kind === "weekly_report") return { proposal: [{ text: "Snapshot đã lưu.", sourceRefs: [], metricKeys: ["submissionsInPeriodTotal"] }], aiMode: "mock" };
  if (input.submission.content === "outage") throw new AiUnavailableError();
  return { proposal: {
    summary: "Nhận xét kiểm thử",
    results: input.submission.criteriaSnapshot.map(c => ({ criterionId: c.id,
      verdict: input.submission.content === "insufficient" ? "insufficient_evidence" : input.submission.content === "negative" ? "not_met" : "met",
      evidence: input.submission.content === "insufficient" ? [] : [{ submissionId: input.submission.content === "invalid" ? "wrong-submission" : input.submission.id, quote: input.submission.content }],
      missing: "", suggestion: "",
    })),
  }, aiMode: "mock" };
} } as AiProvider;
const delivery = createDeliveryService(db, ai);
before(async () => {
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
  for (const entry of journal.entries) await pg.exec(await readFile(`drizzle/${entry.tag}.sql`, "utf8"));
  await db.insert(schema.users).values([leader, owner, reviewer, outsider].map(s => s.user));
  await db.insert(schema.projects).values({ id: "delivery-project", name: "Integration", goal: "demo", deliverables: ["demo"], deadline, timeZone: "Asia/Ho_Chi_Minh", createdAt: now });
  await db.insert(schema.projectMembers).values([
    { id: "dl", userId: "leader", role: "leader" as const, canAccept: true },
    { id: "do", userId: "owner", role: "member" as const, canAccept: false },
    { id: "dr", userId: "reviewer", role: "member" as const, canAccept: true },
  ].map(m => ({ ...m, projectId: "delivery-project", skills: [], availableHoursPerWeek: 10 })));
  await db.insert(schema.plans).values({ id: "delivery-plan", projectId: "delivery-project", status: "published", version: 1, draftTasks: [], aiMode: "mock", approvedByMemberId: "dl", publishedAt: now, createdAt: now });
});
after(() => pg.close());
async function task() {
  const [row] = await db.insert(schema.tasks).values({ id: `delivery-${++sequence}`, projectId: "delivery-project", planId: "delivery-plan", title: "Delivery", description: "demo", assigneeMemberId: "do", deadline,
    criteria: [{ id: "criterion", text: "Có hướng dẫn" }], dependencyTaskIds: [], status: "todo", version: 1, createdAt: now }).returning();
  return row;
}

test("shared DB: tracking -> submission -> review -> human acceptance -> persisted report/source", async () => {
  const t = await task();
  const tracking = createTrackingService(db, async () => ({ aiMode: "mock", proposal: { intent: "update", taskId: t.id, requestedStatus: "in_progress" } }));
  const started = await tracking.submitProgressMessage(owner, t.projectId, { content: "Bắt đầu làm", taskId: t.id }, key());
  const submissionInput = { content: "Hướng dẫn đã có.", contentType: "text" as const, expectedTaskVersion: started.task!.version };
  const options = key();
  const submitted = await delivery.submitWork(owner, t.id, submissionInput, options);
  assert.deepEqual(await delivery.submitWork(owner, t.id, submissionInput, options), submitted);
  assert.equal((await createDeliveryService(db, ai).listSubmissions(leader, t.id)).length, 1);
  const reviewKey = key();
  const reviewed = await delivery.requestReview(owner, submitted.submission.id, reviewKey);
  assert.equal(reviewed.task.status, "in_review");
  const calls = aiCalls;
  assert.deepEqual(await delivery.requestReview(owner, submitted.submission.id, reviewKey), reviewed);
  assert.equal(aiCalls, calls);
  await assert.rejects(delivery.confirmAcceptance(owner, t.id, { submissionId: submitted.submission.id, expectedTaskVersion: reviewed.task.version }, key()), hasCode("FORBIDDEN"));
  const acceptKey = key(), acceptInput = { submissionId: submitted.submission.id, expectedTaskVersion: reviewed.task.version };
  const done = await delivery.confirmAcceptance(reviewer, t.id, acceptInput, acceptKey);
  assert.deepEqual(await delivery.confirmAcceptance(reviewer, t.id, acceptInput, acceptKey), done);
  assert.equal((await tracking.getTask(owner, t.id)).status, "done");
  assert(done.acceptedAt! >= submitted.submission.submittedAt);
  const period = { periodStart: new Date(Date.now() - 86400000).toISOString(), periodEnd: new Date().toISOString() };
  const report = await delivery.generateWeeklyReport(leader, t.projectId, period, key());
  assert.equal(report.metrics.statusCounts.done, 1);
  assert.equal(report.metrics.submissionsInPeriodTotal, 1);
  assert.deepEqual(await createDeliveryService(db, ai).getReport(owner, report.id), report);
  assert.equal((await delivery.getReportSource(owner, report.id, { entity: "Submission", id: submitted.submission.id }) as { id: string }).id, submitted.submission.id);
  await assert.rejects(delivery.getReportSource(owner, report.id, { entity: "Task", id: "not-in-snapshot" }), hasCode("NOT_FOUND"));
  await assert.rejects(delivery.getReport(outsider, report.id), hasCode("NOT_FOUND"));
});

test("DB membership beats spoofed session; replay is scoped to actor, path and input", async () => {
  const t = await task();
  const spoofed = { ...outsider, memberships: [{ id: "dl", projectId: t.projectId, userId: "outsider", role: "leader", canAccept: true }] } as Session;
  await assert.rejects(delivery.listSubmissions(spoofed, t.id), hasCode("NOT_FOUND"));
  const options = key(); const input = { contentType: "text" as const, content: "first", expectedTaskVersion: 1 };
  const submitted = await delivery.submitWork(owner, t.id, input, options);
  await assert.rejects(delivery.submitWork(owner, t.id, { ...input, content: "different" }, options), hasCode("IDEMPOTENCY_CONFLICT"));
  await assert.rejects(delivery.requestReview(reviewer, submitted.submission.id, options), hasCode("FORBIDDEN"));
  await assert.rejects(delivery.submitWork(outsider, t.id, input, options), hasCode("NOT_FOUND"));
  await assert.rejects(delivery.generateWeeklyReport(owner, t.projectId, { periodStart: now, periodEnd: deadline }, key()), hasCode("FORBIDDEN"));
});

test("AI failures and fabricated evidence write no review or task changes", async () => {
  for (const content of ["outage", "invalid"]) {
    const t = await task();
    const submitted = await delivery.submitWork(owner, t.id, { contentType: "text", content, expectedTaskVersion: 1 }, key());
    await assert.rejects(delivery.requestReview(owner, submitted.submission.id, key()));
    assert.equal(await delivery.getReview(owner, submitted.submission.id), null);
    assert.equal((await db.select().from(schema.tasks).where(eq(schema.tasks.id, t.id)))[0].version, submitted.task.version);
  }
});

test("insufficient evidence blocks acceptance; resubmission preserves history and rejects old acceptance", async () => {
  const t = await task();
  const first = await delivery.submitWork(owner, t.id, { contentType: "text", content: "insufficient", expectedTaskVersion: 1 }, key());
  const reviewed = await delivery.requestReview(owner, first.submission.id, key());
  await assert.rejects(delivery.confirmAcceptance(leader, t.id, { submissionId: first.submission.id, expectedTaskVersion: reviewed.task.version }, key()), hasCode("VALIDATION_ERROR"));
  const second = await delivery.submitWork(owner, t.id, { contentType: "code", content: "valid", expectedTaskVersion: reviewed.task.version }, key());
  assert.equal(second.submission.revision, 2);
  await assert.rejects(delivery.confirmAcceptance(leader, t.id, { submissionId: first.submission.id, expectedTaskVersion: second.task.version }, key()), hasCode("VALIDATION_ERROR"));
  const historical = await delivery.requestReview(owner, first.submission.id, key());
  assert.equal(historical.task.version, second.task.version);
  assert.equal((await delivery.listSubmissions(owner, t.id)).length, 2);
});

test("same-key concurrent submissions create one revision; stale different keys cannot overwrite", async () => {
  const t = await task(), options = key();
  const input = { contentType: "text" as const, content: "concurrent", expectedTaskVersion: 1 };
  const results = await Promise.all([delivery.submitWork(owner, t.id, input, options), delivery.submitWork(owner, t.id, input, options)]);
  assert.deepEqual(results[0], results[1]);
  assert.equal((await delivery.listSubmissions(owner, t.id)).length, 1);
  await assert.rejects(delivery.submitWork(owner, t.id, input, key()), hasCode("VERSION_CONFLICT"));
});

test("report metrics distinguish on-time submission from late acceptance and use half-open periods", async () => {
  const t = await task();
  const sources = { tasks: [{ ...t, deadline: "2026-01-02T00:00:00Z", status: "done" as const, acceptedAt: "2026-01-03T00:00:00Z" }],
    submissions: [{ id: "s", taskId: t.id, submittedAt: "2026-01-01T23:00:00Z" }], messages: [], reviews: [], progressUpdates: [] };
  const metrics = calculateReportMetrics(sources as never, { periodStart: "2026-01-01T00:00:00Z", periodEnd: "2026-01-03T00:00:00Z" }, "2026-01-04T00:00:00Z");
  assert.equal(metrics.submittedOnTimeTotal, 1);
  assert.equal(metrics.acceptedOnTimeTotal, 0);
  assert.equal(metrics.overdueOpenTotal, 0);
});

test("real provider outage never falls back to mock; errors never expose provider secrets", async () => {
  const previous = { ...process.env }, oldFetch = globalThis.fetch;
  try {
    process.env.AI_MODE = "real"; delete process.env.AI_FORCE_MOCK;
    process.env.GEMINI_API_KEY = "test-only-key";
    globalThis.fetch = async () => new Response("secret-provider-body", { status: 503 });
    await assert.rejects(aiProvider.generate("reviewer", { submission: {} as never }), error => error instanceof AiUnavailableError);
    const response = await handleDeliveryApiError(new Error("postgres://secret"));
    assert.equal(response.status, 500);
    assert(!(await response.text()).includes("secret"));
  } finally {
    globalThis.fetch = oldFetch;
    for (const name of ["AI_MODE", "AI_FORCE_MOCK", "GEMINI_API_KEY"]) {
      if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    }
  }
});
