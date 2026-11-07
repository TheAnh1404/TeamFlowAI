import Link from "next/link";
import { requireSession } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { ProjectWizard } from "@/features/planning/components/wizard";
import { HttpError } from "@/server/http/errors";

export default async function Page() {
  let data;
  try {
    const session = await requireSession();
    const db = getDb();
    const allUsers = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users);

    data = {
      actorId: session.user.id,
      users: allUsers.length > 0 ? allUsers : [session.user],
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
