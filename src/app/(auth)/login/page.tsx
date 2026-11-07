import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sessionProvider } from "@/server/auth";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = {
  title: "Đăng nhập — TeamFlow AI",
};

export default async function LoginPage() {
  let session = null;
  try {
    session = await sessionProvider.getCurrentSession();
  } catch {
    session = null;
  }
  if (session) {
    redirect("/app");
  }

  return (
    <>
      <header className="tf-topbar">
        <Link className="tf-brand" href="/">
          ▦ TeamFlow <b>AI</b>
        </Link>
        <Link href="/register">Tạo tài khoản →</Link>
      </header>
      <main className="tf-landing" style={{ maxWidth: "440px", margin: "2rem auto", padding: "1rem" }}>
        <div className="tf-card" style={{ padding: "2rem" }}>
          <p className="tf-eyebrow">XÁC THỰC</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0 1.5rem 0" }}>
            Đăng nhập TeamFlow AI
          </h1>
          <Suspense fallback={<p className="tf-muted">Đang tải biểu mẫu...</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
