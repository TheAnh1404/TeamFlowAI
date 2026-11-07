"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/app";
  const justRegistered = searchParams.get("registered") === "1";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message || "Email hoặc mật khẩu không đúng.");
      }

      // Đăng nhập thành công: chuyển trang theo đường dẫn an toàn và refresh session state
      router.replace(nextParam);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể kết nối đến máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tf-page" noValidate>
      {justRegistered && (
        <div role="status" className="tf-alert success" style={{ marginBottom: "1rem" }}>
          Tài khoản đã được tạo thành công trong hệ thống. Vui lòng nhập mật khẩu để đăng nhập.
        </div>
      )}

      {error && (
        <div role="alert" className="tf-alert error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="login-email">
          Địa chỉ email <span aria-hidden="true">*</span>
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isSubmitting}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="an@example.com"
        />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="login-password">
            Mật khẩu <span aria-hidden="true">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              cursor: "pointer",
              fontSize: "0.8125rem",
              padding: 0,
            }}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
        <input
          id="login-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          disabled={isSubmitting}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu tài khoản"
        />
      </div>

      <div className="tf-actions" style={{ marginTop: "1.5rem" }}>
        <button type="submit" className="tf-button" disabled={isSubmitting} style={{ width: "100%" }}>
          {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </div>

      <p className="tf-muted" style={{ textAlign: "center", marginTop: "1.25rem" }}>
        Chưa có tài khoản?{" "}
        <Link href="/register" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
          Tạo tài khoản mới
        </Link>
      </p>
    </form>
  );
}
