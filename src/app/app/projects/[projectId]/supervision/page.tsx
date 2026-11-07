import Link from "next/link";
import { requireSession } from "@/server/auth";
import { HttpError } from "@/server/http/errors";
import { supervisionService } from "@/features/supervision/server/service";
import { ProjectTimeline } from "@/features/tracking/components/project-timeline";
export default async function Page({params}:{params:Promise<{projectId:string}>}) {
  let data;
  try { const s=await requireSession();data=await supervisionService().overview(s,(await params).projectId); }
  catch(e){return <main className="tf-page"><h1>Chưa thể mở dự án</h1><p role="alert">{e instanceof HttpError?e.message:"Chưa đọc được dữ liệu giám sát. Hãy kiểm tra kết nối và migration."}</p><Link href="/app">Về dự án của tôi</Link></main>;}
  return <main className="tf-page"><Link href="/app">← Dự án của tôi</Link><p className="tf-eyebrow">{data.readOnly?"MENTOR · QUYỀN XEM":"GIÁM SÁT DỰ ÁN"}</p><h1>{data.project.name}</h1><ProjectTimeline data={data}/><details className="tf-card"><summary className="tf-panel-summary">Mục tiêu và phạm vi đã thống nhất</summary><p style={{whiteSpace:"pre-wrap"}}>{data.project.goal}</p></details><p>Nhận định tiến độ dựa trên dữ liệu đã lưu. Mentor có thể theo dõi và trao đổi với trưởng nhóm; thao tác giao việc, thay kế hoạch và nghiệm thu thuộc các tài khoản được cấp quyền tương ứng.</p></main>;
}
