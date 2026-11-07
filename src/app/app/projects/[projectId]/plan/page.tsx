import Link from "next/link";
import { inArray } from "drizzle-orm";
import { requireSession } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { HttpError } from "@/server/http/errors";
import { planningService } from "@/features/planning/server/implementation";
import { PlanEditor } from "@/features/planning/components/plan-editor";
export default async function Page({ params }: {
    params: Promise<{
        projectId: string;
    }>;
}) {
    let data;
    try {
        const { projectId } = await params;
        const s = await requireSession(), service = planningService();
        const details = await service.getProject(s, projectId);
        data = { details, initialPlan: await service.getPlan(s, projectId), users: await getDb().select().from(users).where(inArray(users.id, details.members.map(m => m.userId))), leader: details.members.some(m => m.userId === s.user.id && m.role === "leader") };
    }
    catch (e) {
        return <main className="tf-page"><h1>Chưa thể mở kế hoạch</h1><p role="alert">{e instanceof HttpError ? e.message : "Chưa đọc được dữ liệu. Kiểm tra cấu hình Neon và migration."}</p><Link href="/app">Về dự án của tôi</Link></main>;
    }
    return <PlanEditor {...data}/>;
}
