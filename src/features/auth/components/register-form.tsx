"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { unicodeLength, utf8ByteLength } from "@/contracts/auth";

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = displayName.trim();
    const nameLen = unicodeLength(trimmedName);
    if (nameLen < 2 || nameLen > 100) {
      setError("Tên hiển thị phải từ 2 đến 100 ký tự.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Địa chỉ email không đúng định dạng.");
      return;
    }

    const passLen = unicodeLength(password);
    if (passLen < 8 || passLen > 128) {
      setError("Mật khẩu phải từ 8 đến 128 ký tự.");
      return;
    }

    if (utf8ByteLength(password) > 512) {
      setError("Mật khẩu không được vượt quá 512 byte.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp với mật khẩu đã nhập.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: trimmedName,
          email: trimmedEmail,
          password,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message || "Đăng ký không thành công. Vui lòng thử lại.");
      }

      // Tự động đăng nhập ngay sau khi đăng ký để người dùng vào thẳng không gian làm việc
      try {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        });
        if (loginRes.ok) {
          router.replace("/app");
          router.refresh();
          return;
        }
      } catch {
        // Fallback sang chuyển hướng /login nếu auto-login gặp sự cố
      }

      router.push(`/login?registered=1&email=${encodeURIComponent(trimmedEmail)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể kết nối đến máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tf-page" noValidate>
      {error && (
        <div role="alert" className="tf-alert error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="register-name">
          Họ và tên hoặc tên gọi <span aria-hidden="true">*</span>
        </label>
        <input
          id="register-name"
          name="displayName"
          type="text"
          autoComplete="name"
          required
          disabled={isSubmitting}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ví dụ: Nguyễn An"
        />
        <p className="tf-muted" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
          Từ 2 đến 100 ký tự. Tên này sẽ hiển thị trong dự án và khi giao việc.
        </p>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <label htmlFor="register-email">
          Địa chỉ email <span aria-hidden="true">*</span>
        </label>
        <input
          id="register-email"
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
          <label htmlFor="register-password">
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
          id="register-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          disabled={isSubmitting}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tối thiểu 8 ký tự"
        />
        <p className="tf-muted" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
          Mật khẩu từ 8 đến 128 ký tự. Cho phép dấu cách, ký tự Unicode và trình quản lý mật khẩu.
        </p>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="register-confirm-password">
            Xác nhận mật khẩu <span aria-hidden="true">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              cursor: "pointer",
              fontSize: "0.8125rem",
              padding: 0,
            }}
            aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
          >
            {showConfirmPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
        <input
          id="register-confirm-password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          disabled={isSubmitting}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Nhập lại mật khẩu để xác nhận"
        />
      </div>

      <div className="tf-actions" style={{ marginTop: "1.5rem" }}>
        <button type="submit" className="tf-button" disabled={isSubmitting} style={{ width: "100%" }}>
          {isSubmitting ? "Đang xử lý..." : "Tạo tài khoản"}
        </button>
      </div>

      <p className="tf-muted" style={{ textAlign: "center", marginTop: "1.25rem" }}>
        Đã có tài khoản?{" "}
        <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
          Đăng nhập ngay
        </Link>
      </p>
    </form>
  );
}
