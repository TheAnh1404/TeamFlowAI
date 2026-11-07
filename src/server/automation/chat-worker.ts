import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { createCoordinator, type Coordinator } from "@/features/tracking/server/coordinator";
import { trackingReader } from "@/features/tracking/server/store";
import { decideProgress } from "@/features/tracking/server/policy";
import { assert, notFound } from "@/server/http/errors";
import { finishJob, serializeProject, withLease, type Job } from "./queue";
export async function analyzePost(db: Database, job: Job, coordinator: Coordinator = createCoordinator()) {
    const [post] = await db.select().from(s.chatPosts).where(and(eq(s.chatPosts.id, String(job.payload.postId)), eq(s.chatPosts.projectId, job.projectId!)));
    if (!post)
        throw notFound();
    const availableTasks = await trackingReader(db).listTasks(post.projectId);
    const [author] = await db.select().from(s.projectMembers).where(and(eq(s.projectMembers.id, post.authorMemberId), eq(s.projectMembers.projectId, post.projectId)));
    if (!author) {
        await withLease(db, job, async (tx) => { await tx.update(s.chatPosts).set({ analysisStatus: "failed", updatedAt: new Date().toISOString() }).where(eq(s.chatPosts.id, post.id)); await finishJob(tx, job, "skipped"); });
        return;
    }
    // Instruction-like content and completion claims remain discussion even if a provider errs.
    const safeDiscussion = /bỏ qua|ignore|system prompt|đổi hạn|deadline|đổi người|tiêu chí|xong rồi|hoàn thành/iu.test(post.content);
    if (safeDiscussion) {
        await withLease(db, job, async (tx) => { await serializeProject(tx, post.projectId); await tx.update(s.chatPosts).set({ analysisStatus: "skipped", updatedAt: new Date().toISOString() }).where(eq(s.chatPosts.id, post.id)); await finishJob(tx, job); });
        return;
    }
    const generated = await coordinator({ message: { content: post.content, taskId: post.taskId }, tasks: availableTasks });
    await withLease(db, job, async (tx) => {
        await serializeProject(tx, post.projectId);
        const [current] = await tx.select().from(s.chatPosts).where(eq(s.chatPosts.id, post.id)).for("update");
        const [existing] = await tx.select().from(s.messages).where(eq(s.messages.chatPostId, post.id));
        if (existing) {
            await finishJob(tx, job);
            return;
        }
        const [actor] = await tx.select().from(s.projectMembers).where(and(eq(s.projectMembers.id, current.authorMemberId), eq(s.projectMembers.projectId, current.projectId)));
        if (!actor) {
            await finishJob(tx, job, "skipped");
            return;
        }
        const p = generated.proposal, now = new Date().toISOString();
        assert(!p.taskId || availableTasks.some(t => t.id === p.taskId), 502, "AI_INVALID_OUTPUT", "Nguồn task không hợp lệ.");
        const targetId = p.taskId ?? post.taskId;
        const [task] = targetId ? await tx.select().from(s.tasks).where(and(eq(s.tasks.id, targetId), eq(s.tasks.projectId, post.projectId))).for("update") : [];
        const authorized = task && (actor.role === "leader" || task.assigneeMemberId === actor.id);
        const mutable = task && ["todo", "in_progress", "blocked"].includes(task.status);
        const stale = Date.parse(now) - Date.parse(post.createdAt) > 30 * 60000 || !post.taskId || task?.version !== post.taskVersionAtPost || task?.id !== post.taskId;
        const decision = decideProgress({ member: actor, tasks: availableTasks, selectedTaskId: post.taskId ?? undefined, content: post.content, proposal: p });
        const clarify = decision.resolution === "clarification_required" || (p.intent === "update" && (stale || !task || !p.requestedStatus || (p.requestedStatus === "blocked" && !p.blocker?.trim())));
        const apply = decision.resolution === "applied" && !clarify && authorized && mutable;
        const [message] = await tx.insert(s.messages).values({ id: randomUUID(), projectId: post.projectId, authorMemberId: actor.id, content: post.content, chatPostId: post.id,
            taskId: clarify ? null : task?.id ?? post.taskId, candidateTaskIds: clarify ? availableTasks.filter(t => (actor.role === "leader" || t.assigneeMemberId === actor.id) && ["todo", "in_progress", "blocked"].includes(t.status)).map(t => t.id) : [],
            resolution: apply ? "applied" : clarify ? "clarification_required" : "no_change", clarificationQuestion: clarify ? stale ? "Cập nhật này cần bạn xác nhận công việc và phiên bản hiện tại trước khi áp dụng." : p.clarificationQuestion ?? "Bạn muốn cập nhật công việc và trạng thái nào?" : null,
            aiMode: generated.aiMode, createdAt: now }).returning();
        if (apply && task) {
            await tx.execute(sql `select set_config('teamflow.actor_member_id',${actor.id},true)`);
            await tx.update(s.tasks).set({ status: p.requestedStatus!, version: task.version + 1 }).where(eq(s.tasks.id, task.id));
            await tx.insert(s.progressUpdates).values({ id: randomUUID(), projectId: post.projectId, taskId: task.id, messageId: message.id, authorMemberId: actor.id, statusBefore: task.status, statusAfter: p.requestedStatus!, note: post.content, blocker: p.requestedStatus === "blocked" ? p.blocker! : null, createdAt: now });
        }
        await tx.update(s.chatPosts).set({ analysisStatus: clarify ? "clarification_required" : "analyzed", updatedAt: now }).where(eq(s.chatPosts.id, post.id));
        await finishJob(tx, job);
    });
}
