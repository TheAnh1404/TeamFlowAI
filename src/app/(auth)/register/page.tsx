import Link from "next/link";
import { redirect } from "next/navigation";
import { sessionProvider } from "@/server/auth";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata = {
  title: "Đăng ký tài khoản — TeamFlow AI",
};

export default async function RegisterPage() {
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
        <Link href="/login">Đăng nhập →</Link>
      </header>
      <main className="tf-landing" style={{ maxWidth: "480px", margin: "2rem auto", padding: "1rem" }}>
        <div className="tf-card" style={{ padding: "2rem" }}>
          <p className="tf-eyebrow">KHỞI ĐẦU</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0 1.5rem 0" }}>
            Tạo tài khoản mới
          </h1>
          <RegisterForm />
        </div>
      </main>
    </>
  );
}
