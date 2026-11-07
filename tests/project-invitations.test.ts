import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db/client";
import type { Session } from "../src/server/auth/contracts";
import { seedDemoUsers } from "../src/server/db/seed";
import { sendProjectInvitation, listProjectInvitations, respondToProjectInvitation } from "../src/features/planning/server/invitations";
import { createPlanningService } from "../src/features/planning/server/implementation";

const pg = new PGlite();
const db = drizzle(pg, { schema }) as unknown as Database;
const now = new Date().toISOString();
const deadline = new Date(Date.now() + 7 * 86400000).toISOString();
let leader: Session;
let member: Session;
let projectId: string;

before(async () => {
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
  for (const entry of journal.entries) await pg.exec(await readFile(`drizzle/${entry.tag}.sql`, "utf8"));
  await seedDemoUsers(db);
  const people = await db.select().from(schema.users);
  leader = { user: people.find(user => user.id === "demo-tv1")!, memberships: [] };
  member = { user: people.find(user => user.id === "demo-tv2")!, memberships: [] };
  projectId = "invite-project";
  await db.insert(schema.projects).values({ id: projectId, name: "Invite project", goal: "Test invitation", deliverables: ["Plan"], deadline, timeZone: "Asia/Ho_Chi_Minh", createdAt: now });
  await db.insert(schema.projectMembers).values({ id: "invite-leader", projectId, userId: leader.user.id, role: "leader", canAccept: true, skills: ["Planning"], availableHoursPerWeek: 10 });
});

after(async () => { await pg.close(); });

test("leader invitation notifies the invitee; acceptance creates membership and resolves notice", async () => {
  const result = await sendProjectInvitation(leader, projectId, { userId: member.user.id, skills: ["Backend"], availableHoursPerWeek: 12 }, db);
  assert.equal(result.status, "pending");
  const pending = await listProjectInvitations(member, db);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].projectName, "Invite project");
  assert.equal(pending[0].inviter.displayName, leader.user.displayName);
  const [notice] = await db.select().from(schema.notifications).where(eq(schema.notifications.id, result.id));
  assert.equal(notice.type, "project_invitation");
  await respondToProjectInvitation(member, result.id, { action: "accept" }, db);
  const memberships = await db.select().from(schema.projectMembers).where(eq(schema.projectMembers.userId, member.user.id));
  assert.equal(memberships.length, 1);
  assert.deepEqual(memberships[0].skills, ["Backend"]);
  assert.equal(memberships[0].availableHoursPerWeek, 12);
  const [resolved] = await db.select().from(schema.notifications).where(eq(schema.notifications.id, result.id));
  assert(resolved.readAt);
  assert(resolved.resolvedAt);
  assert.equal((await listProjectInvitations(member, db)).length, 0);
});

test("pending invitations block planning; non-leaders cannot invite", async () => {
  const another = await db.select().from(schema.users).where(eq(schema.users.id, "demo-tv3"));
  const invitation = await sendProjectInvitation(leader, projectId, { userId: another[0].id, skills: ["QA"], availableHoursPerWeek: 8 }, db);
  const planning = createPlanningService(db);
  await assert.rejects(planning.generatePlanDraft(leader, projectId), (error: unknown) => error instanceof Error && error.message.includes("phản hồi lời mời"));
  await assert.rejects(sendProjectInvitation(member, projectId, { userId: another[0].id, skills: ["QA"], availableHoursPerWeek: 8 }, db), (error: unknown) => error instanceof Error && error.message.includes("Chỉ trưởng nhóm"));
  await respondToProjectInvitation({ user: another[0], memberships: [] }, invitation.id, { action: "decline" }, db);
  assert.equal((await listProjectInvitations(member, db)).length, 0);
});

