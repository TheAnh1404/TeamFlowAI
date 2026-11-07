import { WeeklyReportView } from "@/features/delivery/components/WeeklyReportView";
import { requireSession } from "@/server/auth";
import { authorizationProvider } from "@/server/auth";
import { HttpError } from "@/server/http/errors";
import Link from "next/link";

export default async function WeeklyReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  try { await authorizationProvider.assertProjectMember(await requireSession(), projectId); }
  catch(e){return <main className="tf-page"><h1>Chưa thể mở báo cáo</h1><p role="alert">{e instanceof HttpError?e.message:"Chưa đọc được dữ liệu dự án."}</p><Link href="/app">Về dự án của tôi</Link></main>;}
  return <WeeklyReportView projectId={projectId} />;
}
