import Link from "next/link";
import { inArray } from "drizzle-orm";
import { DEMO_ACCOUNTS } from "@/server/auth/session";
import { requireSession } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { ProjectWizard } from "@/features/planning/components/wizard";
import { HttpError } from "@/server/http/errors";
export default async function Page() {
    let data;
    try {
        const session = await requireSession();
        data = { actorId: session.user.id, users: await getDb().select().from(users).where(inArray(users.id, [...Object.values(DEMO_ACCOUNTS).filter(id=>id!==DEMO_ACCOUNTS.MENTOR), session.user.id])) };
    }
    catch (e) {
        return <main className="tf-page"><h1>Bắt đầu dự án</h1><p role="alert">{e instanceof HttpError ? e.message : "Chưa đọc được dữ liệu. Kiểm tra cấu hình Neon và migration."}</p><Link className="tf-button" href="/app">Về danh sách dự án để đăng nhập</Link></main>;
    }
    return <ProjectWizard {...data}/>;
}
