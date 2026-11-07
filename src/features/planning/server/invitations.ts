import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, ilike, notInArray, or } from "drizzle-orm";
import type { Session } from "@/server/auth/contracts";
import { getDb, type Database } from "@/server/db/client";
import { projectInvitations, projectMembers, projects, plans, users, notifications } from "@/server/db/schema";
import { projectMember } from "@/server/auth/access";
import { assert, notFound } from "@/server/http/errors";
import { inviteProjectMemberSchema, respondInvitationSchema } from "../invitations";

async function leader(projectId: string, session: Session, db: Database) {
  const actor = await projectMember(db, session, projectId);
  assert(actor.role === "leader", 403, "FORBIDDEN", "Chỉ trưởng nhóm được mời thành viên.");
  return actor;
}

export async function invitationCandidates(session: Session, projectId: string, query: string, db: Database = getDb()) {
  const q = query.trim();
  assert(q.length >= 2 && q.length <= 100, 422, "VALIDATION_ERROR", "Nhập ít nhất 2 ký tự để tìm thành viên.");
  await leader(projectId, session, db);
  const [plan] = await db.select({ id: plans.id }).from(plans).where(eq(plans.projectId, projectId));
  assert(!plan, 409, "INVALID_TRANSITION", "Chỉ có thể mời thành viên trước khi tạo kế hoạch.");
  const existing = await db.select({ userId: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, projectId));
  const alreadyInvited = await db.select({ userId: projectInvitations.inviteeUserId }).from(projectInvitations)
    .where(and(eq(projectInvitations.projectId, projectId), eq(projectInvitations.status, "pending")));
  const excluded = new Set([...existing.map(row => row.userId), ...alreadyInvited.map(row => row.userId), session.user.id]);
  const excludedIds = [...excluded];
  return db.select({ id: users.id, displayName: users.displayName, createdAt: users.createdAt }).from(users)
    .where(and(or(ilike(users.displayName, `%${q}%`), ilike(users.email, `%${q}%`)), excludedIds.length ? notInArray(users.id, excludedIds) : undefined))
    .limit(8);
}

export async function listOutgoingProjectInvitations(session: Session, projectId: string, db: Database = getDb()) {
  await leader(projectId, session, db);
  const rows = await db.select({ invitation: projectInvitations, invitee: users }).from(projectInvitations)
    .innerJoin(users, eq(users.id, projectInvitations.inviteeUserId))
    .where(and(eq(projectInvitations.projectId, projectId), eq(projectInvitations.status, "pending")))
    .orderBy(projectInvitations.createdAt);
  return rows.map(row => ({ id: row.invitation.id, displayName: row.invitee.displayName, createdAt: row.invitation.createdAt }));
}

export async function sendProjectInvitation(session: Session, projectId: string, raw: unknown, db: Database = getDb()) {
  const input = inviteProjectMemberSchema.parse(raw);
  return db.transaction(async tx => {
    const [project] = await tx.select().from(projects).where(eq(projects.id, projectId)).for("update");
    if (!project) throw notFound();
    const actor = await projectMember(tx, session, projectId);
    assert(actor.role === "leader", 403, "FORBIDDEN", "Chỉ trưởng nhóm được mời thành viên.");
    const [plan] = await tx.select({ id: plans.id }).from(plans).where(eq(plans.projectId, projectId));
    assert(!plan, 409, "INVALID_TRANSITION", "Chỉ có thể mời thành viên trước khi tạo kế hoạch.");
    const [user] = await tx.select().from(users).where(eq(users.id, input.userId));
    if (!user) throw notFound();
    const existing = await tx.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
    assert(!existing.some(row => row.userId === user.id), 409, "MEMBER_EXISTS", "Tài khoản này đã tham gia dự án.");
    const currentInvites = await tx.select().from(projectInvitations).where(and(eq(projectInvitations.projectId, projectId), eq(projectInvitations.status, "pending")));
    assert(existing.length + currentInvites.length < 8, 422, "VALIDATION_ERROR", "Dự án tối đa 8 thành viên và lời mời đang chờ.");
    assert(!currentInvites.some(row => row.inviteeUserId === user.id), 409, "INVITATION_EXISTS", "Lời mời đang chờ phản hồi.");
    const now = new Date().toISOString(), id = randomUUID();
    const invitation = { id, projectId, inviteeUserId: user.id, inviterMemberId: actor.id, skills: input.skills, availableHoursPerWeek: input.availableHoursPerWeek, status: "pending" as const, createdAt: now, respondedAt: null };
    await tx.insert(projectInvitations).values(invitation);
    await tx.insert(notifications).values({
      id, recipientUserId: user.id, projectId, dedupeKey: `project-invitation:${id}`, type: "project_invitation",
      text: `${session.user.displayName} mời bạn tham gia dự án ${project.name}.`, target: "/app", title: "Lời mời tham gia dự án",
      message: `${session.user.displayName} mời bạn tham gia dự án ${project.name}.`, kind: null, snapshot: null, createdAt: now,
      readAt: null, resolvedAt: null,
    });
    return { id, status: invitation.status };
  });
}

export async function listProjectInvitations(session: Session, db: Database = getDb()) {
  const rows = await db.select({ invitation: projectInvitations, projectName: projects.name, inviter: users })
    .from(projectInvitations)
    .innerJoin(projects, eq(projects.id, projectInvitations.projectId))
    .innerJoin(projectMembers, eq(projectMembers.id, projectInvitations.inviterMemberId))
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(and(eq(projectInvitations.inviteeUserId, session.user.id), eq(projectInvitations.status, "pending")))
    .orderBy(projectInvitations.createdAt);
  return rows.map(row => ({ id: row.invitation.id, projectId: row.invitation.projectId, projectName: row.projectName,
    inviter: { id: row.inviter.id, displayName: row.inviter.displayName, createdAt: row.inviter.createdAt },
    skills: row.invitation.skills, availableHoursPerWeek: row.invitation.availableHoursPerWeek,
    createdAt: row.invitation.createdAt, status: row.invitation.status }));
}

export async function respondToProjectInvitation(session: Session, invitationId: string, raw: unknown, db: Database = getDb()) {
  const { action } = respondInvitationSchema.parse(raw);
  return db.transaction(async tx => {
    const [invitation] = await tx.select().from(projectInvitations).where(eq(projectInvitations.id, invitationId)).for("update");
    if (!invitation || invitation.inviteeUserId !== session.user.id) throw notFound();
    assert(invitation.status === "pending", 409, "INVALID_TRANSITION", "Lời mời đã được phản hồi.");
    await tx.select().from(projects).where(eq(projects.id, invitation.projectId)).for("update");
    const [plan] = await tx.select({ id: plans.id }).from(plans).where(eq(plans.projectId, invitation.projectId));
    assert(!plan, 409, "INVALID_TRANSITION", "Dự án đã bắt đầu lập kế hoạch nên không thể nhận lời mời này.");
    const now = new Date().toISOString();
    if (action === "accept") {
      const members = await tx.select().from(projectMembers).where(eq(projectMembers.projectId, invitation.projectId));
      assert(members.length < 8, 409, "PROJECT_FULL", "Dự án đã đủ 8 thành viên.");
      if (!members.some(member => member.userId === session.user.id)) {
        await tx.insert(projectMembers).values({ id: randomUUID(), projectId: invitation.projectId, userId: session.user.id, role: "member", canAccept: false, skills: invitation.skills, availableHoursPerWeek: invitation.availableHoursPerWeek });
      }
    }
    await tx.update(projectInvitations).set({ status: action === "accept" ? "accepted" : "declined", respondedAt: now }).where(eq(projectInvitations.id, invitation.id));
    await tx.update(notifications).set({ readAt: now, resolvedAt: now }).where(eq(notifications.id, invitation.id));
    return { status: action === "accept" ? "accepted" : "declined" };
  });
}
