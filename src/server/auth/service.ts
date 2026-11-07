import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { RegisterInput, LoginInput, RegisterResponse, LogoutResponse, SessionData } from "@/contracts/auth";
import type { Database } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { userCredentials, users } from "@/server/db/schema";
import { HttpError } from "@/server/http/errors";
import { dummyVerify, hashPassword, verifyPassword } from "./password";
import { checkAndConsumeRateLimit, extractClientIp, RATE_LIMITS } from "./rate-limit";
import { createSession, findSession, revokeSession } from "./session";

export interface AuthService {
  register(request: Request, input: RegisterInput): Promise<RegisterResponse>;
  login(
    request: Request,
    input: LoginInput,
    previousToken?: string
  ): Promise<{ token: string; expiresAt: string; sessionData: SessionData }>;
  logout(token?: string): Promise<LogoutResponse>;
}

export function createAuthService(db: Database): AuthService {
  return {
    async register(request: Request, input: RegisterInput): Promise<RegisterResponse> {
      // 1. Kiểm tra chế độ đăng ký
      const regMode = process.env.AUTH_REGISTRATION_MODE || "internal";
      if (regMode === "disabled") {
        throw new HttpError(403, "REGISTRATION_DISABLED", "Chức năng đăng ký tài khoản hiện đang tạm tắt.");
      }

      // 2. Kiểm tra Rate Limit theo IP
      const clientIp = extractClientIp(request);
      const ipLimit = await checkAndConsumeRateLimit(db, "register_ip", clientIp, RATE_LIMITS.registerIp);
      if (!ipLimit.allowed) {
        throw new HttpError(
          429,
          "RATE_LIMITED",
          `Quá nhiều yêu cầu đăng ký từ địa chỉ của bạn. Vui lòng thử lại sau ${ipLimit.retryAfterSeconds} giây.`
        );
      }

      const email = input.email;
      const displayName = input.displayName;

      // 3. Băm mật khẩu ngoài transaction để không giữ khóa DB
      const passwordHash = await hashPassword(input.password);
      const nowIso = new Date().toISOString();

      // 4. Tạo tài khoản trong transaction
      try {
        await db.transaction(async (tx) => {
          const [existing] = await tx.select().from(users).where(eq(users.email, email));
          if (existing) {
            // Chống dò tài khoản: Không ghi đè, không thay đổi mật khẩu/tên của tài khoản cũ
            return;
          }

          const userId = randomUUID();
          await tx.insert(users).values({
            id: userId,
            displayName,
            email,
            createdAt: nowIso,
          });

          await tx.insert(userCredentials).values({
            userId,
            passwordHash,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        });
      } catch (err: unknown) {
        // Race condition: Nếu hai request cùng email tới cùng lúc và vi phạm unique index,
        // vẫn trả cùng thông báo chung hợp lệ mà không làm crash ứng dụng
        const isUniqueViolation =
          err instanceof Error &&
          (err.message.includes("unique") || err.message.includes("duplicate key"));
        if (!isUniqueViolation) {
          throw err;
        }
      }

      // 5. Trả cùng phản hồi 202 chung cho cả email mới và email đã tồn tại
      return {
        accepted: true,
        message: "Yêu cầu đăng ký đã được xử lý. Bạn có thể đăng nhập bằng thông tin tài khoản của mình.",
      };
    },

    async login(
      request: Request,
      input: LoginInput,
      previousToken?: string
    ): Promise<{ token: string; expiresAt: string; sessionData: SessionData }> {
      const clientIp = extractClientIp(request);
      const email = input.email;

      // 1. Kiểm tra Rate Limit IP (100 lần / 15 phút)
      const ipLimit = await checkAndConsumeRateLimit(db, "login_ip", clientIp, RATE_LIMITS.loginIp);
      if (!ipLimit.allowed) {
        throw new HttpError(
          429,
          "RATE_LIMITED",
          `Quá nhiều lần thử đăng nhập từ mạng của bạn. Vui lòng thử lại sau ${ipLimit.retryAfterSeconds} giây.`
        );
      }

      // 2. Kiểm tra Rate Limit Email + IP (10 lần / 15 phút)
      const emailIpLimit = await checkAndConsumeRateLimit(
        db,
        "login_email_ip",
        `${email}:${clientIp}`,
        RATE_LIMITS.loginEmailIp
      );
      if (!emailIpLimit.allowed) {
        throw new HttpError(
          429,
          "RATE_LIMITED",
          `Quá nhiều lần thử đăng nhập cho tài khoản này. Vui lòng thử lại sau ${emailIpLimit.retryAfterSeconds} giây.`
        );
      }

      // 3. Tìm tài khoản và credential theo email
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        await dummyVerify();
        throw new HttpError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
      }

      const [credential] = await db
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, user.id));

      if (!credential) {
        // Tài khoản không có mật khẩu (ví dụ legacy seed/demo)
        await dummyVerify();
        throw new HttpError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
      }

      // 4. Xác minh mật khẩu với Argon2id
      const isValid = await verifyPassword(credential.passwordHash, input.password);
      if (!isValid) {
        throw new HttpError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
      }

      // 5. Cấp phiên đăng nhập mới, thu hồi token cũ nếu có
      const { token, expiresAt } = await createSession(db, user.id, previousToken);
      const sessionData = await findSession(db, token);
      if (!sessionData) {
        throw new HttpError(500, "SESSION_CREATION_FAILED", "Không thể khởi tạo phiên làm việc.");
      }

      return { token, expiresAt, sessionData };
    },

    async logout(token?: string): Promise<LogoutResponse> {
      await revokeSession(db, token);
      return { signedOut: true };
    },
  };
}

export const authService: AuthService = {
  register: (...args) => createAuthService(getDb()).register(...args),
  login: (...args) => createAuthService(getDb()).login(...args),
  logout: (...args) => createAuthService(getDb()).logout(...args),
};
