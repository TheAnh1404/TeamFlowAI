import "server-only";
import {eq} from "drizzle-orm";
import {getDb,type Database} from "@/server/db/client";
import {userAiSettings} from "@/server/db/schema";
import type {Session} from "@/server/auth/contracts";
import {assert} from "@/server/http/errors";
import {encryptApiKey,decryptApiKey,encryptionKey} from "./crypto";
import {saveAiSettingsSchema,checkAiSettingsSchema,type AiSettingsStatus,type ConnectionCheck} from "../contracts";
import {runWithAiOverride} from "@/server/ai/context";
import {generateReal} from "@/server/ai/real-provider";
import {AiError,AiUnavailableError,AiInvalidOutputError} from "@/server/ai/errors";
import type {AiProvider,AiInputByKind} from "@/server/ai/contracts";
import {validatePlannerProposal,validateTrackingProposal,validateReviewerProposal,validateReportProposal} from "@/server/ai/validator";

interface Options {masterKey?:Buffer;fetcher?:typeof fetch;probe?:AiProvider}
const modelDefault=()=>process.env.OPENAI_MODEL?.trim()||"gpt-4o-mini";
function failure(status?:number):{code:string;message:string}{
  if(status===401)return {code:"INVALID_KEY",message:"OpenAI không chấp nhận khóa này. Hãy kiểm tra khóa còn hiệu lực và đúng project."};
  if(status===403)return {code:"PERMISSION_DENIED",message:"Khóa hoặc project chưa có quyền cho thao tác này. Kiểm tra quyền API và model."};
  if(status===429)return {code:"RATE_LIMIT_OR_QUOTA",message:"Yêu cầu bị giới hạn hoặc tài khoản hết hạn mức API. Kiểm tra usage/billing rồi thử lại."};
  if(status===404)return {code:"MODEL_NOT_AVAILABLE",message:"Model không tồn tại hoặc khóa chưa được cấp quyền dùng model này."};
  if(status===400)return {code:"MODEL_NOT_COMPATIBLE",message:"Model chưa tương thích với cấu trúc JSON của trợ lý. Chọn model hỗ trợ Chat Completions và JSON."};
  return {code:"CONNECTION_FAILED",message:"Chưa kết nối được OpenAI. Kiểm tra kết nối hoặc thử lại sau."};
}
const realProbe:AiProvider={async generate(kind,input){return {proposal:await generateReal(kind,input),aiMode:"real"};}};
type SettingsProbeKind = "planner" | "coordinator" | "reviewer" | "weekly_report";
function sampleInputs(): Pick<AiInputByKind, SettingsProbeKind> {
  const now = new Date().toISOString(), deadline = new Date(Date.now() + 7 * 86400000).toISOString();
  return {
    planner: { project: { id: "probe-project", name: "Kiểm tra kết nối", goal: "Chuẩn bị một tài liệu hướng dẫn ngắn, có nội dung kiểm tra được để thử khả năng trả JSON của Planner.", deliverables: ["Tài liệu hướng dẫn"], deadline, timeZone: "Asia/Ho_Chi_Minh", createdAt: now }, members: [{ id: "probe-member", projectId: "probe-project", userId: "probe-user", role: "leader", canAccept: true, skills: ["Tài liệu", "Kiểm thử"], availableHoursPerWeek: 10 }] },
    coordinator: { message: { content: "Chào nhóm, đây là tin nhắn thử kết nối, không yêu cầu đổi trạng thái.", taskId: null }, tasks: [] },
    reviewer: { submission: { id: "probe-submission", projectId: "probe-project", taskId: "probe-task", authorMemberId: "probe-member", revision: 1, contentType: "text", content: "Hướng dẫn: mở ứng dụng, nhập mục tiêu và kiểm tra bản nháp trước khi công bố.", criteriaSnapshot: [{ id: "probe-criterion", text: "Có hướng dẫn sử dụng" }], submittedAt: now } },
    weekly_report: { metrics: { statusCounts: { todo: 0, in_progress: 0, blocked: 0, in_review: 0, changes_requested: 0, done: 0 }, dueInPeriodTotal: 0, submittedOnTimeTotal: 0, acceptedOnTimeTotal: 0, overdueOpenTotal: 0, submissionsInPeriodTotal: 0, progressUpdatesInPeriodTotal: 0 }, sourceRefs: [], periodStart: new Date(Date.now() - 86400000).toISOString(), periodEnd: now, asOf: now, sources: { tasks: [], messages: [], progressUpdates: [], submissions: [], reviews: [] } },
  };
}
export function createAiSettingsService(db:Database,options:Options={}){
  const master=()=>options.masterKey??encryptionKey();
  const read=async(userId:string)=>(await db.select().from(userAiSettings).where(eq(userAiSettings.userId,userId)))[0];
  async function status(s:Session):Promise<AiSettingsStatus>{
    const row=await read(s.user.id);let canSave=true;try{master();}catch{canSave=false;}
    return {mode:row?.mode??"inherit",model:row?.model??modelDefault(),hasKey:!!row?.encryptedApiKey,canSave,lastCheck:row?.lastCheck??null};
  }
  return {
    get:status,
    async save(s:Session,raw:unknown){
      const input=saveAiSettingsSchema.parse(raw),prior=await read(s.user.id);
      const encrypted=input.apiKey?encryptApiKey(input.apiKey,s.user.id,master()):prior?.encryptedApiKey??null;
      assert(input.mode!=="real"||encrypted,422,"KEY_REQUIRED","Nhập API key trước khi bật OpenAI thật.");
      const row={userId:s.user.id,encryptedApiKey:encrypted,model:input.model,mode:input.mode,lastCheck:input.apiKey||prior?.model!==input.model?null:prior?.lastCheck??null,updatedAt:new Date().toISOString()};
      await db.insert(userAiSettings).values(row).onConflictDoUpdate({target:userAiSettings.userId,set:row});
      return status(s);
    },
    async remove(s:Session){await db.delete(userAiSettings).where(eq(userAiSettings.userId,s.user.id));return status(s);},
    async check(s:Session,raw:unknown):Promise<ConnectionCheck>{
      const input=checkAiSettingsSchema.parse(raw),prior=await read(s.user.id);
      const key=input.apiKey??(prior?.encryptedApiKey?decryptApiKey(prior.encryptedApiKey,s.user.id,master()):null);
      assert(key,422,"KEY_REQUIRED","Nhập khóa hoặc lưu API key trước khi kiểm tra.");
      const result:ConnectionCheck={checkedAt:new Date().toISOString(),test:input.test,ok:false,code:"NOT_CHECKED",message:"",modelAvailable:null,models:[],agents:[]};
      if(input.test==="key"){
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
        try {
          const response=await (options.fetcher??fetch)("https://api.openai.com/v1/models",{headers:{Authorization:`Bearer ${key}`},signal:controller.signal,redirect:"error",cache:"no-store"});
          if(!response.ok){Object.assign(result,failure(response.status));await response.body?.cancel();}
          else {
            const body:unknown=await response.json();
            assert(body&&typeof body==="object"&&"data"in body&&Array.isArray(body.data),502,"INVALID_RESPONSE","Phản hồi danh sách model không hợp lệ.");
            result.models=body.data.flatMap((item:unknown)=>item&&typeof item==="object"&&"id"in item&&typeof item.id==="string"?[item.id]:[]).slice(0,500).sort();
            result.modelAvailable=result.models.includes(input.model);result.ok=result.modelAvailable;
            result.code=result.modelAvailable?"KEY_ACCEPTED":"MODEL_NOT_AVAILABLE";
            result.message=result.modelAvailable?"Khóa được chấp nhận và thấy model đã chọn. Bước này chưa xác nhận quota hoặc khả năng chạy từng trợ lý.":"Khóa được chấp nhận, nhưng chưa thấy model đã chọn. Chọn model trong danh sách hoặc kiểm tra quyền của khóa.";
          }
        }catch{Object.assign(result,{code:controller.signal.aborted?"TIMEOUT":"CONNECTION_FAILED",message:controller.signal.aborted?"OpenAI phản hồi chậm. Bạn có thể kiểm tra lại.":"Chưa nhận được danh sách model. Kiểm tra kết nối hoặc quyền đọc model của khóa."});}
        finally{clearTimeout(timer);}
      }else{
        const samples=sampleInputs(),kinds = ["planner","coordinator","reviewer","weekly_report"] as const;
        result.agents=await runWithAiOverride({mode:"real",apiKey:key,model:input.model,maxOutputTokens:2048},()=>Promise.all(kinds.map(async (agent: (typeof kinds)[number])=>{
          try {const generated=await (options.probe??realProbe).generate(agent,samples[agent]);assert(generated.aiMode==="real",502,"PROBE_NOT_REAL","Kiểm tra cần phản hồi từ API thật.");
            if(agent==="planner"){
              const proposal=validatePlannerProposal(generated.proposal);
              const keys=new Set(proposal.tasks.map(t=>t.tempKey));
              if(!proposal.tasks.length||keys.size!==proposal.tasks.length||proposal.tasks.some(t=>!t.steps?.length||!t.assignmentReason||!t.estimatedHours||t.assigneeMemberId!=="probe-member"||!Number.isFinite(Date.parse(t.deadline))||Date.parse(t.deadline)>Date.parse(samples.planner.project.deadline)||t.dependencyTempKeys.some(k=>!keys.has(k))))throw new AiInvalidOutputError();
            }else if(agent==="coordinator"){
              const proposal=validateTrackingProposal(generated.proposal);
              if(proposal.intent==="update"||(proposal.intent==="clarify"&&!proposal.clarificationQuestion))throw new AiInvalidOutputError();
            }else if(agent==="reviewer")validateReviewerProposal(generated.proposal,samples.reviewer.submission);
            else validateReportProposal(generated.proposal,samples.weekly_report);
            return {agent,ok:true,code:"CONNECTED",message:"API thật phản hồi đúng cấu trúc của trợ lý bằng dữ liệu kiểm tra."};}
          catch(error){if(error instanceof AiError&&error.code==="AI_INVALID_OUTPUT")return {agent,ok:false,code:"AI_INVALID_OUTPUT",message:"Đã gọi API nhưng phản hồi chưa đạt cấu trúc/bằng chứng của trợ lý."};
            if(error instanceof AiError&&error.code==="AI_TIMEOUT")return {agent,ok:false,code:"TIMEOUT",message:"Trợ lý phản hồi quá thời gian; thử lại hoặc chọn model phù hợp."};
            return {agent,ok:false,...failure(error instanceof AiUnavailableError?error.upstreamStatus:undefined)};
          }
        })));
        result.ok=result.agents.every(a=>a.ok);result.code=result.ok?"AGENTS_READY":"AGENT_CHECK_FAILED";
        result.message=result.ok?"Bốn trợ lý đã trả phản hồi thật đúng cấu trúc kiểm tra. Nội dung dự án thực tế vẫn cần người dùng rà soát.":"Một số trợ lý chưa vượt qua kiểm tra. Xem kết quả từng trợ lý; không tự chuyển sang mẫu trong bước kiểm tra này.";
      }
      if(!input.apiKey&&prior?.model===input.model)await db.update(userAiSettings).set({lastCheck:result}).where(eq(userAiSettings.userId,s.user.id));
      return result;
    },
  };
}
export const aiSettingsService=()=>createAiSettingsService(getDb());

export async function withUserAiSettings<T>(db:Database,session:Session,action:()=>Promise<T>):Promise<T>{
  const [row]=await db.select().from(userAiSettings).where(eq(userAiSettings.userId,session.user.id));
  if(!row||row.mode==="inherit")return action();
  if(row.mode==="mock")return runWithAiOverride({mode:"mock"},action);
  assert(row.encryptedApiKey,422,"KEY_REQUIRED","Cấu hình AI của bạn chưa có API key.");
  return runWithAiOverride({mode:"real",apiKey:decryptApiKey(row.encryptedApiKey,session.user.id),model:row.model},action);
}
