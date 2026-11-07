import { sessionProvider } from "@/server/auth";
import { endpoint,assert } from "@/server/http/errors";
export async function GET(request:Request){
  const token=new URL(request.url).searchParams.get("token");
  if(!token||!/^([a-f0-9]{64})$/.test(token))return endpoint(async()=>{assert(false,422,"INVALID_VERIFICATION","Mã xác minh không hợp lệ.");});
  const target=`/app?verifyEmail=${token}`,session=await sessionProvider.getCurrentSession();
  return Response.redirect(new URL(session?target:`/login?next=${encodeURIComponent(target)}`,request.url),303);
}
