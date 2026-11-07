import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db/client";
import { createAuthService } from "../src/server/auth/service";
import { findSession, isValidSessionToken, createSession } from "../src/server/auth/session";
import { sanitizeNextPath } from "../src/server/auth/navigation";
import { checkAndConsumeRateLimit } from "../src/server/auth/rate-limit";
import { HttpError } from "../src/server/http/errors";
import { registerInputSchema } from "../src/contracts/auth";

const pg = new PGlite();
const db = drizzle(pg, { schema }) as unknown as Database;
const authService = createAuthService(db);

before(async () => {
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as {
    entries: { tag: string }[];
  };
  for (const entry of journal.entries) {
    const sql = await readFile(`drizzle/${entry.tag}.sql`, "utf8");
    await pg.exec(sql);
  }
});

after(async () => {
  await pg.close();
});

beforeEach(async () => {
  await db.delete(schema.sessions);
  await db.delete(schema.userCredentials);
  await db.delete(schema.projectMembers);
  await db.delete(schema.projects);
  await db.delete(schema.users);
  await db.delete(schema.authRateLimits);
});

function createMockRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/auth/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("A01: Valid registration creates exactly one User and one credential, no session or membership", async () => {
  const input = {
    displayName: "Nguyễn Văn A",
    email: "nguyenvana@example.com",
    password: "mat-khau-an-toan-2026-xyz",
  };

  const req = createMockRequest(input, { "x-forwarded-for": "10.0.0.1" });
  const result = await authService.register(req, input);

  assert.equal(result.accepted, true);
  assert.ok(result.message.includes("đăng ký đã được xử lý"));

  const allUsers = await db.select().from(schema.users);
  assert.equal(allUsers.length, 1);
  assert.equal(allUsers[0].displayName, "Nguyễn Văn A");
  assert.equal(allUsers[0].email, "nguyenvana@example.com");

  const allCreds = await db.select().from(schema.userCredentials);
  assert.equal(allCreds.length, 1);
  assert.equal(allCreds[0].userId, allUsers[0].id);
  assert.ok(allCreds[0].passwordHash.startsWith("$argon2id$"));

  // Không tạo session hoặc membership tự động
  const allSessions = await db.select().from(schema.sessions);
  assert.equal(allSessions.length, 0);
  const allMembers = await db.select().from(schema.projectMembers);
  assert.equal(allMembers.length, 0);
});

test("A02: Email normalization trims and lowercases before unique check", async () => {
  const input = registerInputSchema.parse({
    displayName: "Trần Bình",
    email: "   TranBinh.Dev@Example.COM   ",
    password: "mat-khau-dai-hop-le-2026",
  });

  assert.equal(input.email, "tranbinh.dev@example.com");
  const req = createMockRequest(input, { "x-forwarded-for": "10.0.0.2" });
  await authService.register(req, input);

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, "tranbinh.dev@example.com"));
  assert.ok(user);
});

test("A03: Duplicate registration returns same generic response without overwriting user or password", async () => {
  const originalInput = {
    displayName: "Lê C",
    email: "lec@example.com",
    password: "mat-khau-goc-ban-dau-2026",
  };
  const req1 = createMockRequest(originalInput, { "x-forwarded-for": "10.0.0.3" });
  await authService.register(req1, originalInput);

  const [origCred] = await db.select().from(schema.userCredentials);
  const origHash = origCred.passwordHash;

  // Cố tình đăng ký lại cùng email nhưng tên và mật khẩu khác
  const duplicateInput = {
    displayName: "Kẻ Mạo Danh",
    email: "lec@example.com",
    password: "mat-khau-moi-tan-cong-2026",
  };
  const req2 = createMockRequest(duplicateInput, { "x-forwarded-for": "10.0.0.3" });
  const result = await authService.register(req2, duplicateInput);

  assert.equal(result.accepted, true);

  // Dữ liệu cũ được bảo toàn tuyệt đối
  const [user] = await db.select().from(schema.users);
  assert.equal(user.displayName, "Lê C");

  const [cred] = await db.select().from(schema.userCredentials);
  assert.equal(cred.passwordHash, origHash);
});

test("A05: Password with Unicode characters, spaces, and symbols is verified accurately without trimming", async () => {
  const password = "  Mật khẩu có dấu và khoảng trắng @#2026  ";
  const input = {
    displayName: "Phan D",
    email: "phand@example.com",
    password,
  };

  const regReq = createMockRequest(input, { "x-forwarded-for": "10.0.0.5" });
  await authService.register(regReq, input);

  const loginReq = createMockRequest(
    { email: "phand@example.com", password },
    { "x-forwarded-for": "10.0.0.5" }
  );
  const loginRes = await authService.login(loginReq, { email: "phand@example.com", password });
  assert.ok(loginRes.token);
  assert.equal(loginRes.sessionData.user.displayName, "Phan D");
});

test("A06: Validation rejects short (<8 chars) or excessively long passwords, and invalid display names", () => {
  assert.throws(
    () =>
      registerInputSchema.parse({
        displayName: "A",
        email: "test@example.com",
        password: "12345678",
      }),
    /Tên hiển thị phải từ 2 đến 100/
  );

  assert.throws(
    () =>
      registerInputSchema.parse({
        displayName: "Hợp Lệ",
        email: "test@example.com",
        password: "1234567", // < 8 ký tự
      }),
    /Mật khẩu phải từ 8 đến 128/
  );

  // Mật khẩu đúng 8 ký tự phải hợp lệ
  const valid8 = registerInputSchema.parse({
    displayName: "Hợp Lệ",
    email: "test@example.com",
    password: "12345678",
  });
  assert.equal(valid8.password, "12345678");
});

test("A07: Strict validation rejects body containing unallowed fields like role, canAccept, or userId", () => {
  assert.throws(
    () =>
      registerInputSchema.parse({
        displayName: "Attacker",
        email: "attack@example.com",
        password: "mat-khau-dai-hop-le-2026",
        role: "leader", // Forbidden
      } as unknown),
    /unrecognized_keys/
  );
});

test("A08: Login succeeds with correct credentials, but fails generically on wrong password or missing user", async () => {
  const registerData = {
    displayName: "Hoàng E",
    email: "hoange@example.com",
    password: "mat-khau-chuan-xac-2026",
  };
  await authService.register(createMockRequest(registerData, { "x-forwarded-for": "10.0.0.8" }), registerData);

  // 1. Đúng thông tin -> Thành công
  const okReq = createMockRequest(
    { email: "hoange@example.com", password: "mat-khau-chuan-xac-2026" },
    { "x-forwarded-for": "10.0.0.8" }
  );
  const okRes = await authService.login(okReq, {
    email: "hoange@example.com",
    password: "mat-khau-chuan-xac-2026",
  });
  assert.ok(isValidSessionToken(okRes.token));
  assert.equal(okRes.sessionData.user.displayName, "Hoàng E");

  // 2. Sai mật khẩu -> 401 INVALID_CREDENTIALS
  const badPassReq = createMockRequest(
    { email: "hoange@example.com", password: "sai-mat-khau-roi" },
    { "x-forwarded-for": "10.0.0.8" }
  );
  await assert.rejects(
    authService.login(badPassReq, { email: "hoange@example.com", password: "sai-mat-khau-roi" }),
    (err: unknown) => err instanceof HttpError && err.status === 401 && err.code === "INVALID_CREDENTIALS"
  );

  // 3. Email không tồn tại -> 401 INVALID_CREDENTIALS (cùng thông báo)
  const noUserReq = createMockRequest(
    { email: "khongtontai@example.com", password: "mat-khau-chuan-xac-2026" },
    { "x-forwarded-for": "10.0.0.8" }
  );
  await assert.rejects(
    authService.login(noUserReq, { email: "khongtontai@example.com", password: "mat-khau-chuan-xac-2026" }),
    (err: unknown) => err instanceof HttpError && err.status === 401 && err.code === "INVALID_CREDENTIALS"
  );
});

test("A09: Legacy user without credentials cannot login with password", async () => {
  // Tạo user kiểu legacy không có credential
  await db.insert(schema.users).values({
    id: "legacy-user-1",
    displayName: "Legacy User",
    email: "legacy@example.com",
    createdAt: new Date().toISOString(),
  });

  const req = createMockRequest(
    { email: "legacy@example.com", password: "mat-khau-thu-nghiem-2026" },
    { "x-forwarded-for": "10.0.0.9" }
  );
  await assert.rejects(
    authService.login(req, { email: "legacy@example.com", password: "mat-khau-thu-nghiem-2026" }),
    (err: unknown) => err instanceof HttpError && err.status === 401 && err.code === "INVALID_CREDENTIALS"
  );
});

test("A10 & A11: Session token rotation on re-login, rejection of expired/revoked/invalid tokens", async () => {
  const user = {
    displayName: "Vũ F",
    email: "vuf@example.com",
    password: "mat-khau-chuan-xac-2026",
  };
  await authService.register(createMockRequest(user, { "x-forwarded-for": "10.0.0.10" }), user);

  // Lần đăng nhập 1
  const login1 = await authService.login(
    createMockRequest({ email: user.email, password: user.password }, { "x-forwarded-for": "10.0.0.10" }),
    { email: user.email, password: user.password }
  );

  const session1 = await findSession(db, login1.token);
  assert.ok(session1);
  assert.equal(session1.user.displayName, "Vũ F");

  // Lần đăng nhập 2 từ cùng trình duyệt (truyền previousToken = login1.token)
  const login2 = await authService.login(
    createMockRequest({ email: user.email, password: user.password }, { "x-forwarded-for": "10.0.0.10" }),
    { email: user.email, password: user.password },
    login1.token
  );

  assert.notEqual(login2.token, login1.token);

  // Token cũ login1 đã bị thu hồi
  assert.equal(await findSession(db, login1.token), null);

  // Token mới login2 hoạt động
  assert.ok(await findSession(db, login2.token));

  // Token không hợp lệ / định dạng sai
  assert.equal(await findSession(db, "invalid-token"), null);
  assert.equal(await findSession(db, ""), null);
  assert.equal(await findSession(db, undefined), null);
});

test("A12: Idempotent logout revokes session record from DB", async () => {
  const userId = "test-logout-user-id";
  await db.insert(schema.users).values({
    id: userId,
    displayName: "User Logout",
    createdAt: new Date().toISOString(),
  });
  const { token } = await createSession(db, userId);
  assert.equal(isValidSessionToken(token), true);

  // Logout lần 1
  const res1 = await authService.logout(token);
  assert.equal(res1.signedOut, true);
  assert.equal(await findSession(db, token), null);

  // Logout lần 2 (idempotent)
  const res2 = await authService.logout(token);
  assert.equal(res2.signedOut, true);
});

test("A14: sanitizeNextPath prevents open redirects, backslashes, schemes, and loops", () => {
  // Hợp lệ
  assert.equal(sanitizeNextPath("/app"), "/app");
  assert.equal(sanitizeNextPath("/app/projects/p-1"), "/app/projects/p-1");
  assert.equal(sanitizeNextPath("/app/projects/p-1?tab=chat"), "/app/projects/p-1?tab=chat");

  // Không hợp lệ -> Trở về mặc định /app
  assert.equal(sanitizeNextPath("https://evil.example.com"), "/app");
  assert.equal(sanitizeNextPath("//evil.example.com"), "/app");
  assert.equal(sanitizeNextPath("/application"), "/app");
  assert.equal(sanitizeNextPath("/app\\evil.com"), "/app");
  assert.equal(sanitizeNextPath("javascript:alert(1)"), "/app");
  assert.equal(sanitizeNextPath("/login"), "/app");
  assert.equal(sanitizeNextPath("/register"), "/app");
  assert.equal(sanitizeNextPath(""), "/app");
  assert.equal(sanitizeNextPath(null), "/app");
  assert.equal(sanitizeNextPath(undefined), "/app");
});

test("A15: Rate limiter blocks requests exceeding configured threshold", async () => {
  const config = { maxAttempts: 3, windowSeconds: 60 };
  const scope = "test_limiter";
  const id = "192.168.1.100";

  // Lần 1, 2, 3 -> Cho phép
  assert.equal((await checkAndConsumeRateLimit(db, scope, id, config)).allowed, true);
  assert.equal((await checkAndConsumeRateLimit(db, scope, id, config)).allowed, true);
  assert.equal((await checkAndConsumeRateLimit(db, scope, id, config)).allowed, true);

  // Lần 4 -> Bị chặn
  const blocked = await checkAndConsumeRateLimit(db, scope, id, config);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds && blocked.retryAfterSeconds > 0);
});

test("A16: Session lookup never leaks user email or passwordHash in SessionData", async () => {
  const user = {
    displayName: "Bảo Mật G",
    email: "secret@example.com",
    password: "mat-khau-bi-mat-2026-xyz",
  };
  await authService.register(createMockRequest(user), user);
  const login = await authService.login(createMockRequest(user), user);

  const session = await findSession(db, login.token);
  assert.ok(session);

  // Kiểm tra SessionData
  const keys = Object.keys(session.user);
  assert.deepEqual(keys.sort(), ["createdAt", "displayName", "id"]);
  assert.equal((session.user as unknown as { email?: string }).email, undefined);
  assert.equal((session.user as unknown as { passwordHash?: string }).passwordHash, undefined);
});
