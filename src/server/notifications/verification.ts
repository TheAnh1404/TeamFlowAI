import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import type { Session } from "@/server/auth/contracts";
import * as s from "@/server/db/schema";
import { assert, HttpError } from "@/server/http/errors";
import { enqueue, finishJob, withLease, type Job } from "@/server/automation/queue";
import { appOrigin, resendTransport, type MailTransport } from "./email";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function requestEmailVerification(db: Database, session: Session) {
    const origin = appOrigin();
    assert(process.env.EMAIL_FROM && process.env.RESEND_API_KEY, 422, "EMAIL_CONFIGURATION_REQUIRED", "Email chưa được cấu hình trên server.");
    return db.transaction(async (tx) => {
        await tx.execute(sql `select pg_advisory_xact_lock(hashtext(${`verify-email:${session.user.id}`}))`);
        const [user] = await tx.select().from(s.users).where(eq(s.users.id, session.user.id));
        assert(user?.email, 422, "EMAIL_REQUIRED", "Tài khoản chưa có địa chỉ email.");
        if (user.emailVerifiedAt)
            return { requested: false, alreadyVerified: true };
        const [prior] = await tx.select().from(s.emailVerificationTokens).where(eq(s.emailVerificationTokens.userId, user.id)).orderBy(desc(s.emailVerificationTokens.createdAt)).limit(1);
        assert(!prior || Date.now() - Date.parse(prior.createdAt) >= 60000, 429, "RATE_LIMITED", "Chờ một phút trước khi yêu cầu lại.");
        const token = randomBytes(32).toString("hex"), now = new Date().toISOString(), expiresAt = new Date(Date.now() + 3600000).toISOString(), id = randomUUID();
        await tx.insert(s.emailVerificationTokens).values({ id, userId: user.id, email: user.email, tokenHash: hash(token), expiresAt, createdAt: now });
        const job = await enqueue(tx, "email_verification", `verification:${id}`, { verificationId: id, userId: user.id }, null, now, expiresAt);
        assert(job, 409, "IDEMPOTENCY_CONFLICT", "Không tạo được yêu cầu xác minh.");
        await tx.insert(s.emailDeliveries).values({ id: randomUUID(), jobId: job.id, recipientUserId: user.id, providerKey: `teamflow:${job.id}`, status: "sending", request: { from: process.env.EMAIL_FROM!, to: user.email, subject: "TeamFlow AI — Xác minh địa chỉ email", text: `Mở liên kết sau và đăng nhập tài khoản của bạn để xác minh email (hết hạn sau 60 phút):\n${origin}/api/auth/email-verification/open?token=${token}\n\nNếu bạn không yêu cầu, có thể bỏ qua email này.` }, firstAttemptAt: now, updatedAt: now });
        return { requested: true, alreadyVerified: false };
    });
}
export async function confirmEmailVerification(db: Database, session: Session, token: string) {
    assert(/^[a-f0-9]{64}$/.test(token), 422, "INVALID_VERIFICATION", "Mã xác minh không hợp lệ.");
    return db.transaction(async (tx) => {
        const [record] = await tx.select().from(s.emailVerificationTokens).where(and(eq(s.emailVerificationTokens.tokenHash, hash(token)), eq(s.emailVerificationTokens.userId, session.user.id))).for("update");
        const [user] = await tx.select().from(s.users).where(eq(s.users.id, session.user.id)).for("update");
        assert(record && record.email === user.email && record.expiresAt > new Date().toISOString(), 422, "INVALID_VERIFICATION", "Liên kết hết hạn hoặc không thuộc tài khoản này.");
        if (!record.consumedAt) {
            const now = new Date().toISOString();
            await tx.update(s.users).set({ emailVerifiedAt: now }).where(eq(s.users.id, user.id));
            await tx.update(s.emailVerificationTokens).set({ consumedAt: now }).where(eq(s.emailVerificationTokens.id, record.id));
        }
        return { verified: true };
    });
}
export async function deliverVerification(db: Database, job: Job, transport: MailTransport = resendTransport) {
    const [record] = await db.select().from(s.emailVerificationTokens).where(eq(s.emailVerificationTokens.id, String(job.payload.verificationId)));
    const [user] = await db.select().from(s.users).where(eq(s.users.id, String(job.payload.userId)));
    const [delivery] = await db.select().from(s.emailDeliveries).where(eq(s.emailDeliveries.jobId, job.id));
    const sandbox = (process.env.EMAIL_SANDBOX_ALLOWLIST ?? "").split(",").map(v => v.trim().toLowerCase());
    if (!record || !user || !delivery || record.consumedAt || record.expiresAt <= new Date().toISOString() || user.email !== record.email || user.emailVerifiedAt || ((process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") && !sandbox.includes(user.email.toLowerCase()))) {
        await withLease(db, job, tx => finishJob(tx, job, "skipped"));
        return;
    }
    if (["accepted", "delivered", "bounced", "complained"].includes(delivery.status)) {
        await withLease(db, job, tx => finishJob(tx, job));
        return;
    }
    let result: {
        id: string;
    };
    try {
        result = await transport(delivery.request, delivery.providerKey);
    }
    catch (error) {
        if (error instanceof HttpError && error.code === "EMAIL_DELIVERY_UNCERTAIN")
            await withLease(db, job, async (tx) => { await tx.update(s.emailDeliveries).set({ status: "uncertain", updatedAt: new Date().toISOString() }).where(eq(s.emailDeliveries.id, delivery.id)); });
        throw error;
    }
    await withLease(db, job, async (tx) => { await tx.update(s.emailDeliveries).set({ providerId: result.id, status: "accepted", updatedAt: new Date().toISOString() }).where(eq(s.emailDeliveries.id, delivery.id)); await finishJob(tx, job); });
}
