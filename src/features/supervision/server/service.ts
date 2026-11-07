import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { projects, projectMembers, projectMentors, users, plans, tasks, notifications } from "@/server/db/schema";
import type { Session } from "@/server/auth/contracts";
import { projectMember } from "@/server/auth/access";
import { assert, notFound } from "@/server/http/errors";
import { projectSupervision } from "@/features/tracking/supervision";

export function createSupervisionService(db: Database) {
  async function leader(s: Session, id: string) {
    const member = await projectMember(db,s,id);
    assert(member.role === "leader",403,"FORBIDDEN","Chỉ trưởng nhóm được quản lý quyền xem của mentor.");
    return member;
  }
  return {
    async grantMentor(s: Session, projectId: string, userId: string) {
      await leader(s,projectId);
      return db.transaction(async tx => {
        const actor=await projectMember(tx,s,projectId);
        assert(actor.role === "leader",403,"FORBIDDEN","Chỉ trưởng nhóm được quản lý mentor.");
        assert((await tx.select().from(users).where(eq(users.id,userId))).length,422,"VALIDATION_ERROR","Tài khoản không tồn tại.");
        const membership=await tx.select().from(projectMembers).where(and(eq(projectMembers.projectId,projectId),eq(projectMembers.userId,userId)));
        assert(!membership.length,422,"VALIDATION_ERROR","Thành viên đã có quyền xem; mentor dùng tài khoản riêng để giữ quyền chỉ đọc.");
        const grant={id:randomUUID(),projectId,userId,grantedByMemberId:actor.id,createdAt:new Date().toISOString()};
        await tx.insert(projectMentors).values(grant).onConflictDoNothing();
        return (await tx.select().from(projectMentors).where(and(eq(projectMentors.projectId,projectId),eq(projectMentors.userId,userId))))[0];
      });
    },
    async revokeMentor(s: Session, projectId: string, userId: string) {
      await leader(s,projectId);
      await db.transaction(async tx => {
        const actor=await projectMember(tx,s,projectId);
        assert(actor.role === "leader",403,"FORBIDDEN","Chỉ trưởng nhóm được quản lý mentor.");
        await tx.delete(projectMentors).where(and(eq(projectMentors.projectId,projectId),eq(projectMentors.userId,userId)));
        await tx.delete(notifications).where(and(eq(notifications.projectId,projectId),eq(notifications.recipientUserId,userId)));
      });
      return {revoked:true};
    },
    async listMentors(s: Session, projectId: string) {
      await leader(s,projectId);
      return db.select({grant:projectMentors,user:users}).from(projectMentors).innerJoin(users,eq(projectMentors.userId,users.id)).where(eq(projectMentors.projectId,projectId));
    },
    async listMentorProjects(s: Session) {
      return db.select({project:projects}).from(projectMentors).innerJoin(projects,eq(projectMentors.projectId,projects.id)).where(eq(projectMentors.userId,s.user.id)).orderBy(desc(projects.createdAt));
    },
    async overview(s: Session, projectId: string) {
      return db.transaction(async tx => {
        const membership=await tx.select().from(projectMembers).where(and(eq(projectMembers.projectId,projectId),eq(projectMembers.userId,s.user.id)));
        const grant=await tx.select().from(projectMentors).where(and(eq(projectMentors.projectId,projectId),eq(projectMentors.userId,s.user.id)));
        if(!membership.length&&!grant.length)throw notFound();
        const [project]=await tx.select().from(projects).where(eq(projects.id,projectId));if(!project)throw notFound();
        const current=await tx.execute<{timestamp:string}>(sql`select transaction_timestamp()::text as timestamp`);
        const asOf=new Date(current.rows[0].timestamp).toISOString();
        const rows=await tx.select({task:tasks}).from(tasks).innerJoin(plans,and(eq(plans.id,tasks.planId),eq(plans.status,"published"))).where(eq(tasks.projectId,projectId));
        const members=await tx.select({member:projectMembers,user:users}).from(projectMembers).innerJoin(users,eq(users.id,projectMembers.userId)).where(eq(projectMembers.projectId,projectId));
        const published=rows.map(r=>r.task);
        return {project,asOf,members,tasks:published,summary:projectSupervision(project,published,asOf),readOnly:!membership.length};
      },{isolationLevel:"repeatable read",accessMode:"read only"});
    },
    async listNotifications(s: Session) {
      return db.select().from(notifications).where(eq(notifications.recipientUserId,s.user.id)).orderBy(desc(notifications.createdAt));
    },
    async markRead(s: Session, id: string) {
      const [notice]=await db.select().from(notifications).where(and(eq(notifications.id,id),eq(notifications.recipientUserId,s.user.id)));
      if(!notice)throw notFound();
      if(notice.readAt)return notice;
      return (await db.update(notifications).set({readAt:new Date().toISOString()}).where(and(eq(notifications.id,id),eq(notifications.recipientUserId,s.user.id))).returning())[0];
    },
  };
}
export const supervisionService=()=>createSupervisionService(getDb());

/** Called by the independent worker, never by an unauthenticated public endpoint. */
export async function scanDeadlineRisks(db: Database, clock?: () => string) {
  const projectRows=await db.select({project:projects}).from(projects).innerJoin(plans,and(eq(plans.projectId,projects.id),eq(plans.status,"published")));
  let created=0;
  for(const {project} of projectRows) {
    created+=await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`deadline-risk:${project.id}`}))`);
      const time=await tx.execute<{timestamp:string}>(sql`select transaction_timestamp()::text as timestamp`);
      const asOf=clock?.()??new Date(time.rows[0].timestamp).toISOString();
      const published=await tx.select().from(tasks).where(eq(tasks.projectId,project.id));
      const summary=projectSupervision(project,published,asOf);
      if(!summary.deadlineRisk) {
        if(summary.progressPercent!==null&&summary.progressPercent>80)await tx.update(notifications).set({resolvedAt:asOf}).where(and(eq(notifications.projectId,project.id),eq(notifications.kind,"deadline_risk"),isNull(notifications.resolvedAt)));
        return 0;
      }
      const members=await tx.select({userId:projectMembers.userId}).from(projectMembers).where(eq(projectMembers.projectId,project.id));
      const mentors=await tx.select({userId:projectMentors.userId}).from(projectMentors).where(eq(projectMentors.projectId,project.id));
      const recipients=[...new Set([...members,...mentors].map(m=>m.userId))];
      const rows=await tx.insert(notifications).values(recipients.map(recipientUserId=>({
        id:randomUUID(),projectId:project.id,recipientUserId,kind:"deadline_risk" as const,
        title:`Cần rà soát tiến độ: ${project.name}`,
        message:`Dự án đã dùng ít nhất 80% thời gian; ${summary.accepted}/${summary.total} công việc đã được nghiệm thu (${summary.progressPercent}%). Đề nghị trưởng nhóm và mentor rà soát các trở ngại và công việc chờ nghiệm thu.`,
        snapshot:{asOf,deadline:project.deadline,accepted:summary.accepted,total:summary.total,progressPercent:summary.progressPercent!,elapsedPercent:summary.elapsedPercent},
        createdAt:asOf,readAt:null,resolvedAt:null,
      }))).onConflictDoNothing().returning({id:notifications.id});
      return rows.length;
    });
  }
  return {projectsChecked:projectRows.length,created};
}
