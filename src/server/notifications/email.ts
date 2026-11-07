import "server-only";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { assert, HttpError } from "@/server/http/errors";
import { eligibleMembers } from "@/server/automation/dispatcher";
import { quietUntil } from "@/server/automation/time";
import { finishJob, withLease, type Job } from "@/server/automation/queue";
export interface MailRequest {
    from: string;
    to: string;
    subject: string;
    text: string;
}
export type MailTransport = (request: MailRequest, key: string) => Promise<{
    id: string;
}>;
export function appOrigin() {
    const value = process.env.APP_ORIGIN;
    assert(value, 422, "EMAIL_CONFIGURATION_REQUIRED", "Chưa cấu hình APP_ORIGIN.");
    const url = new URL(value);
    assert(url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.hostname === "localhost"), 422, "EMAIL_CONFIGURATION_REQUIRED", "APP_ORIGIN không hợp lệ.");
    return url.origin;
}
export const resendTransport: MailTransport = async (request, key) => {
    assert(process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY, 422, "EMAIL_CONFIGURATION_REQUIRED", "Chưa cấu hình nhà cung cấp email.");
    let response: Response;
    try {
        response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(request), signal: AbortSignal.timeout(15000) });
    }
    catch {
        throw new HttpError(503, "EMAIL_DELIVERY_UNCERTAIN", "Chưa xác định provider đã nhận email hay chưa.");
    }
    if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
            const error = new HttpError(503, "EMAIL_PROVIDER_TEMPORARY", "Email provider tạm thời không sẵn sàng.") as HttpError & {
                retryAfterSeconds: number;
            };
            const retry = response.headers.get("retry-after");
            error.retryAfterSeconds = retry ? Number(retry) || Math.max(0, (Date.parse(retry) - Date.now()) / 1000) : 0;
            throw error;
        }
        throw new HttpError(422, "EMAIL_PROVIDER_REJECTED", "Email provider từ chối yêu cầu.");
    }
    const result = z.object({ id: z.string().min(1) }).safeParse(await response.json());
    assert(result.success, 503, "EMAIL_DELIVERY_UNCERTAIN", "Phản hồi email chưa xác định.");
    return result.data;
};
async function emailContent(db: Database, job: Job) {
    const userId = String(job.payload.userId);
    const [user] = await db.select().from(s.users).where(eq(s.users.id, userId));
    const [pref] = await db.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.userId, userId));
    if (!user?.email || !user.emailVerifiedAt || !pref || pref.suppressedAt)
        return null;
    if (job.type === "email_digest" && !pref.preferences.emailEnabled || job.type === "email_report" && !pref.preferences.reportsEmailEnabled)
        return null;
    const quiet = quietUntil(new Date().toISOString(), pref.preferences);
    if (quiet > new Date().toISOString())
        throw new HttpError(422, "QUIET_WINDOW_EXPIRED", "Cửa sổ gửi đang trong giờ yên lặng.");
    const allowlist = (process.env.EMAIL_SANDBOX_ALLOWLIST ?? "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
    // Preview/development always requires an explicit verified allowlist recipient.
    if ((process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") && !allowlist.includes(user.email.toLowerCase()))
        return null;
    const origin = appOrigin(), lines: string[] = [];
    if (job.type === "email_digest") {
        const entries = z.array(z.object({ projectId: z.string(), memberId: z.string(), workDate: z.string(), scheduleVersion: z.number() })).parse(job.payload.entries);
        for (const entry of entries) {
            const [setting] = await db.select().from(s.coordinatorSettings).where(eq(s.coordinatorSettings.projectId, entry.projectId));
            if (!setting?.settings.enabled || !setting.settings.emailEnabled || setting.version !== entry.scheduleVersion)
                continue;
            const members = await eligibleMembers(db, entry.projectId, entry.workDate, setting.settings.participantMemberIds, job.payload.slot === "eod");
            if (!members.some(m => m.id === entry.memberId && m.userId === userId))
                continue;
            const [owner] = await db.select().from(s.projectMembers).where(and(eq(s.projectMembers.id, setting.enabledByMemberId), eq(s.projectMembers.role, "leader"), eq(s.projectMembers.projectId, entry.projectId)));
            if (!owner)
                continue;
            const [project] = await db.select().from(s.projects).where(eq(s.projects.id, entry.projectId));
            lines.push(`${project.name}: ${job.payload.slot === "morning" ? "Xem công việc và ghi kế hoạch hôm nay" : "Gửi cập nhật cuối ngày nếu bạn chưa gửi"} (${entry.workDate}).\n${origin}/app/projects/${encodeURIComponent(entry.projectId)}/chat?workDate=${entry.workDate}#daily-checkin`);
        }
    }
    else {
        const [report] = await db.select().from(s.coordinatorReportRuns).where(and(eq(s.coordinatorReportRuns.id, String(job.payload.reportId)), eq(s.coordinatorReportRuns.projectId, job.projectId!)));
        const [member] = await db.select().from(s.projectMembers).where(and(eq(s.projectMembers.userId, userId), eq(s.projectMembers.projectId, job.projectId!)));
        if (!report || !member || job.payload.draft && member.role !== "leader" || !job.payload.draft && report.status !== "published")
            return null;
        lines.push(`${job.payload.draft ? "Bản nháp báo cáo sẵn sàng để kiểm tra" : "Trưởng nhóm đã chia sẻ báo cáo"}.\n${origin}/app/projects/${encodeURIComponent(job.projectId!)}/reports?report=${report.id}`);
    }
    if (!lines.length)
        return null;
    assert(process.env.EMAIL_FROM, 422, "EMAIL_CONFIGURATION_REQUIRED", "Chưa cấu hình địa chỉ gửi.");
    return { recipientUserId: userId, request: { from: process.env.EMAIL_FROM, to: user.email, subject: job.type === "email_digest" ? "TeamFlow AI — Cập nhật công việc" : "TeamFlow AI — Báo cáo dự án", text: lines.join("\n\n") + "\n\nĐăng nhập để xem nội dung. Bạn có thể tắt email trong tùy chọn thông báo tại ứng dụng." } };
}
export async function deliverEmail(db: Database, job: Job, transport: MailTransport = resendTransport) {
    const [preference] = await db.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.userId, String(job.payload.userId)));
    if (preference) {
        const until = quietUntil(new Date().toISOString(), preference.preferences);
        if (Date.parse(until) > Date.now()) {
            await withLease(db, job, async (tx) => {
                if (until >= job.expiresAt)
                    await finishJob(tx, job, "skipped");
                else
                    await tx.update(s.automationJobs).set({ status: "queued", runAt: until, claimToken: null, lockedUntil: null, attempts: Math.max(0, job.attempts - 1) }).where(eq(s.automationJobs.id, job.id));
            });
            return;
        }
    }
    const content = await emailContent(db, job);
    if (!content) {
        await withLease(db, job, tx => finishJob(tx, job, "skipped"));
        return;
    }
    const delivery = await withLease(db, job, async (tx) => {
        const [old] = await tx.select().from(s.emailDeliveries).where(eq(s.emailDeliveries.jobId, job.id));
        if (old)
            return old;
        const now = new Date().toISOString();
        const [created] = await tx.insert(s.emailDeliveries).values({ id: randomUUID(), jobId: job.id, recipientUserId: content.recipientUserId, providerKey: `teamflow:${job.id}`, status: "sending", request: content.request, firstAttemptAt: now, updatedAt: now }).returning();
        return created;
    });
    if (["accepted", "delivered", "bounced", "complained"].includes(delivery.status)) {
        await withLease(db, job, tx => finishJob(tx, job));
        return;
    }
    assert(Date.now() - Date.parse(delivery.firstAttemptAt) < 23 * 3600000, 422, "EMAIL_UNCERTAIN_ATTENTION", "Quá cửa sổ retry an toàn. Kiểm tra provider trước khi gửi lại.");
    // Recheck membership/check-in immediately before side effect, retain the identical provider request on retry.
    const rechecked = await emailContent(db, job);
    if (!rechecked || rechecked.request.to !== delivery.request.to) {
        await withLease(db, job, tx => finishJob(tx, job, "skipped"));
        return;
    }
    if ((["from", "to", "subject", "text"] as const).some(key => rechecked.request[key] !== delivery.request[key]))
        throw new HttpError(422, "EMAIL_RECIPIENTS_CHANGED", "Nội dung digest đã thay đổi. Không retry một email có người nhận/mục nhắc cũ.");
    try {
        const result = await transport(delivery.request, delivery.providerKey);
        await withLease(db, job, async (tx) => {
            const [latest] = await tx.select().from(s.emailDeliveries).where(eq(s.emailDeliveries.id, delivery.id)).for("update");
            await tx.update(s.emailDeliveries).set({ providerId: result.id, status: ["delivered", "bounced", "complained"].includes(latest.status) ? latest.status : "accepted", updatedAt: new Date().toISOString() }).where(eq(s.emailDeliveries.id, delivery.id));
            await finishJob(tx, job);
        });
    }
    catch (error) {
        if (error instanceof HttpError && error.code === "EMAIL_DELIVERY_UNCERTAIN")
            await withLease(db, job, async (tx) => { await tx.update(s.emailDeliveries).set({ status: "uncertain", updatedAt: new Date().toISOString() }).where(eq(s.emailDeliveries.id, delivery.id)); });
        throw error;
    }
}
export function verifyEmailSignature(body: string, headers: Headers, secret: string, now = Date.now()) {
    const id = headers.get("svix-id"), timestamp = headers.get("svix-timestamp"), signature = headers.get("svix-signature");
    assert(id && timestamp && signature && /^\d+$/.test(timestamp) && Math.abs(now / 1000 - Number(timestamp)) <= 300, 401, "INVALID_WEBHOOK", "Chữ ký webhook không hợp lệ.");
    const expected = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${timestamp}.${body}`).digest();
    const valid = signature.split(" ").some(part => {
        const [version, value] = part.split(",");
        if (version !== "v1" || !value)
            return false;
        const received = Buffer.from(value, "base64");
        return received.length === expected.length && timingSafeEqual(received, expected);
    });
    assert(valid, 401, "INVALID_WEBHOOK", "Chữ ký webhook không hợp lệ.");
    return id;
}
export async function handleEmailWebhook(db: Database, request: Request) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    assert(secret, 503, "WEBHOOK_NOT_CONFIGURED", "Webhook chưa được cấu hình.");
    const reader = request.body?.getReader();
    assert(reader, 422, "INVALID_WEBHOOK", "Thiếu nội dung webhook.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.length;
        if (size > 32768) {
            await reader.cancel();
            throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Webhook quá lớn.");
        }
        chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString("utf8"), id = verifyEmailSignature(raw, request.headers, secret);
    const event = z.object({ type: z.string(), data: z.object({ email_id: z.string() }) }).parse(JSON.parse(raw));
    await db.transaction(async (tx) => {
        const [created] = await tx.insert(s.emailWebhookEvents).values({ id, type: event.type, receivedAt: new Date().toISOString() }).onConflictDoNothing().returning();
        if (!created)
            return;
        const [delivery] = await tx.select().from(s.emailDeliveries).where(eq(s.emailDeliveries.providerId, event.data.email_id)).for("update");
        // A webhook can beat the provider response; rollback so provider retries rather than dropping it.
        assert(delivery, 503, "WEBHOOK_PENDING", "Email đang chờ liên kết provider.");
        const status = ({ "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained" } as Record<string, string>)[event.type];
        if (!status)
            return;
        const rank: Record<string, number> = { sending: 0, uncertain: 0, accepted: 1, delivered: 2, bounced: 3, complained: 4 };
        if ((rank[status] ?? 0) >= (rank[delivery.status] ?? 0))
            await tx.update(s.emailDeliveries).set({ status, updatedAt: new Date().toISOString() }).where(eq(s.emailDeliveries.id, delivery.id));
        if (status === "bounced" || status === "complained")
            await tx.update(s.notificationPreferences).set({ suppressedAt: new Date().toISOString(), suppressionReason: status }).where(eq(s.notificationPreferences.userId, delivery.recipientUserId));
    });
    return { received: true };
}
