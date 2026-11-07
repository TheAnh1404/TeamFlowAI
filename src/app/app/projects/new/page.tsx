import Link from "next/link";
import { requireSession } from "@/server/auth";
import { ProjectWizard } from "@/features/planning/components/wizard";
import { HttpError } from "@/server/http/errors";

export default async function Page() {
  let data;
  try {
    const session = await requireSession();
    data = {
      actorId: session.user.id,
      users: [session.user],
    };
  } catch (e) {
    return (
      <main className="tf-page">
        <h1>Bắt đầu dự án</h1>
        <p role="alert">
          {e instanceof HttpError
            ? e.message
            : "Chưa đọc được dữ liệu. Kiểm tra cấu hình Neon và migration."}
        </p>
        <Link className="tf-button" href="/login">
          Đăng nhập để tiếp tục
        </Link>
      </main>
    );
  }

  return <ProjectWizard {...data} />;
}
