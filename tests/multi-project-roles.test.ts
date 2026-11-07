import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db/client";
import type { Session } from "../src/server/auth/contracts";
import { createAuthorizationProvider } from "../src/server/auth/access";
import { createPlanningService } from "../src/features/planning/server/implementation";
import { createPlanner } from "../src/features/planning/server/planner";
import { createDeliveryService } from "../src/features/delivery/server/service";
import { createTrackingService } from "../src/features/tracking/server/implementation";
import { listSessionProjects } from "../src/server/db/readers";
import { listProjectSummaries } from "../src/server/data/project-queries";
import { HttpError } from "../src/server/http/errors";

const pg = new PGlite();
const db = drizzle(pg, { schema }) as unknown as Database;
const now = new Date().toISOString();
const deadline = new Date(Date.now() + 86400000).toISOString();

function makeSession(id: string, name: string): Session {
  return {
    user: { id, displayName: name, createdAt: now },
    memberships: [],
  };
}

const alice = makeSession("user-alice", "Alice Nguyen");
const bob = makeSession("user-bob", "Bob Tran");

const key = () => ({ idempotencyKey: randomUUID() });
const hasCode = (code: string) => (e: unknown) => e instanceof HttpError && e.code === code;

const mockAi = {
  async generate(kind: string, input: { submission?: { id: string; criteriaSnapshot: { id: string }[] } }) {
    if (kind === "weekly_report") {
      return { proposal: [{ text: "Snapshot đã lưu.", sourceRefs: [], metricKeys: ["submissionsInPeriodTotal"] }], aiMode: "mock" as const };
    }
    const criteria = input?.submission?.criteriaSnapshot ?? [];
    return {
      proposal: {
        summary: "Đạt tiêu chí",
        results: criteria.map((c) => ({
          criterionId: c.id,
          verdict: "met" as const,
          evidence: [{ submissionId: input.submission?.id ?? "sub-1", quote: "bằng chứng" }],
          missing: "",
          suggestion: "",
        })),
      },
      aiMode: "mock" as const,
    };
  },
};

const planning = createPlanningService(db, createPlanner(undefined, "mock"));
const delivery = createDeliveryService(db, mockAi as never);
const tracking = createTrackingService(db, async () => ({
  aiMode: "mock",
  proposal: { intent: "update", taskId: undefined, requestedStatus: "in_progress" },
}));
const auth = createAuthorizationProvider(db);

before(async () => {
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
  for (const entry of journal.entries) {
    await pg.exec(await readFile(`drizzle/${entry.tag}.sql`, "utf8"));
  }
  await db.insert(schema.users).values([alice.user, bob.user]);
});

after(async () => {
  await pg.close();
});

test("Multi-group storage and roles: Alice is Leader of Project 1, but Member of Project 2", async () => {
  // 1. Alice creates Project 1 -> Alice is leader of Project 1
  const p1Result = await planning.createProject(alice, {
    name: "Dự án Nền tảng E-Commerce",
    goal: "Xây dựng cổng thanh toán và quản lý đơn hàng",
    deliverables: ["Cổng thanh toán", "Quản lý đơn hàng"],
    deadline,
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const project1 = p1Result.project;
  assert.equal(p1Result.member.role, "leader");
  assert.equal(p1Result.member.canAccept, true);

  // 2. Bob creates Project 2 -> Bob is leader of Project 2
  const p2Result = await planning.createProject(bob, {
    name: "Dự án Ứng dụng Di động",
    goal: "Phát triển app React Native cho khách hàng",
    deliverables: ["App iOS", "App Android"],
    deadline,
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const project2 = p2Result.project;
  assert.equal(p2Result.member.role, "leader");
  assert.equal(p2Result.member.canAccept, true);

  // 3. Bob adds Alice to Project 2 -> Alice is member of Project 2
  const aliceInP2 = await planning.addProjectMember(bob, project2.id, {
    userId: alice.user.id,
    skills: ["React Native", "TypeScript"],
    availableHoursPerWeek: 15,
    canAccept: false,
  });
  assert.equal(aliceInP2.role, "member");
  assert.equal(aliceInP2.canAccept, false);

  // 4. In Project 1: Alice generates & publishes plan
  await planning.updateProjectMember(alice, project1.id, p1Result.member.id, {
    skills: ["Backend", "NodeJS"],
    availableHoursPerWeek: 20,
    canAccept: true,
  });
  const plan1Draft = await planning.generatePlanDraft(alice, project1.id);
  await planning.publishPlan(alice, plan1Draft.id, {
    expectedVersion: plan1Draft.version,
    approved: true,
  }, key());

  // 5. In Project 2: Bob publishes plan with a task assigned to Alice
  await planning.updateProjectMember(bob, project2.id, p2Result.member.id, {
    skills: ["Mobile Leader"],
    availableHoursPerWeek: 20,
    canAccept: true,
  });
  const plan2Draft = await planning.generatePlanDraft(bob, project2.id);
  // Reassign first task to Alice
  const updatedTasks = plan2Draft.draftTasks.map((t, idx) =>
    idx === 0 ? { ...t, assigneeMemberId: aliceInP2.id } : t
  );
  const plan2Updated = await planning.updatePlanDraft(bob, plan2Draft.id, {
    expectedVersion: plan2Draft.version,
    draftTasks: updatedTasks,
  });
  const plan2 = await planning.publishPlan(bob, plan2Draft.id, {
    expectedVersion: plan2Updated.version,
    approved: true,
  }, key());

  const aliceTaskInP2 = plan2.tasks.find((t) => t.assigneeMemberId === aliceInP2.id)!;
  assert(aliceTaskInP2, "Alice should have a task assigned in Project 2");

  // 6. Query listSessionProjects for Alice:
  const aliceProjects = await listSessionProjects(alice, db);
  assert.equal(aliceProjects.length, 2, "Alice must belong to exactly 2 projects");

  const p1Entry = aliceProjects.find((p) => p.project.id === project1.id)!;
  const p2Entry = aliceProjects.find((p) => p.project.id === project2.id)!;

  assert.equal(p1Entry.member.role, "leader", "Alice must be leader in Project 1");
  assert.equal(p1Entry.member.canAccept, true);

  assert.equal(p2Entry.member.role, "member", "Alice must be member in Project 2");
  assert.equal(p2Entry.member.canAccept, false);
  assert(p2Entry.myTaskTotal !== undefined && p2Entry.myTaskTotal >= 1);

  // 7. Query listProjectSummaries for Alice:
  const aliceSummaries = await listProjectSummaries(alice, db);
  assert.equal(aliceSummaries.length, 2);
  assert.equal(aliceSummaries.find((s) => s.id === project1.id)?.myRole, "leader");
  assert.equal(aliceSummaries.find((s) => s.id === project2.id)?.myRole, "member");

  // 8. Test permissions: Alice in Project 1 (LEADER)
  await auth.assertPlanPublishAllowed(alice, plan1Draft.id);
  await auth.assertReportGenerationAllowed(alice, project1.id);

  // 9. Test permissions: Alice in Project 2 (MEMBER)
  // Alice cannot publish plan in Project 2
  await assert.rejects(
    auth.assertPlanPublishAllowed(alice, plan2Draft.id),
    hasCode("FORBIDDEN")
  );

  // Alice cannot generate weekly reports in Project 2
  await assert.rejects(
    auth.assertReportGenerationAllowed(alice, project2.id),
    hasCode("FORBIDDEN")
  );

  // Alice cannot add members in Project 2
  await assert.rejects(
    planning.addProjectMember(alice, project2.id, {
      userId: bob.user.id,
      skills: ["Test"],
      availableHoursPerWeek: 5,
      canAccept: false,
    }),
    hasCode("FORBIDDEN")
  );

  // Alice cannot accept tasks in Project 2
  await assert.rejects(
    auth.assertAcceptanceAllowed(alice, aliceTaskInP2.id),
    hasCode("FORBIDDEN")
  );

  // 10. Member capability: Alice CAN submit progress message in Project 2
  const progressMsg = await tracking.submitProgressMessage(alice, project2.id, {
    content: "Đang triển khai module giao diện app",
    taskId: aliceTaskInP2.id,
  }, key());
  assert(progressMsg.message.id);

  // 11. Member capability: Alice CAN submit work for her assigned task in Project 2
  const submitted = await delivery.submitWork(alice, aliceTaskInP2.id, {
    contentType: "text",
    content: "Đã hoàn thành module giao diện kèm bằng chứng kiểm thử",
    expectedTaskVersion: aliceTaskInP2.version,
  }, key());
  assert.equal(submitted.submission.authorMemberId, aliceInP2.id);

  // Request review
  const reviewed = await delivery.requestReview(alice, submitted.submission.id, key());
  assert(reviewed.review.id);

  // 12. Alice (Member of Project 2) CANNOT confirm acceptance in Project 2 -> 403 FORBIDDEN
  await assert.rejects(
    delivery.confirmAcceptance(alice, aliceTaskInP2.id, {
      submissionId: submitted.submission.id,
      expectedTaskVersion: reviewed.task.version,
    }, key()),
    hasCode("FORBIDDEN")
  );

  // 13. Only Bob (Leader of Project 2) CAN confirm acceptance in Project 2
  const acceptedByBob = await delivery.confirmAcceptance(bob, aliceTaskInP2.id, {
    submissionId: submitted.submission.id,
    expectedTaskVersion: reviewed.task.version,
  }, key());
  assert.equal(acceptedByBob.status, "done");
  assert.equal(acceptedByBob.acceptedByMemberId, p2Result.member.id);
});
