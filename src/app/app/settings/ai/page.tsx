import Link from "next/link";
import {requireSession} from "@/server/auth";
import {AiSettingsPanel} from "@/features/ai-settings/components/ai-settings-panel";
import {HttpError} from "@/server/http/errors";
export default async function Page(){
  try{await requireSession();}catch(e){return <main className="tf-page"><h1>Cấu hình AI</h1><p role="alert">{e instanceof HttpError?e.message:"Chưa mở được phiên đăng nhập."}</p><Link href="/app">Về dự án của tôi để đăng nhập</Link></main>;}
  return <AiSettingsPanel/>;
}
