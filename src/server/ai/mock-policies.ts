import type { TrackingAiInput, TrackingAiProposal, ReviewAiInput, ReviewAiProposal } from "./contracts";
const normalized=(s:string)=>s.normalize("NFD").replace(/\p{M}/gu,"").replace(/đ/g,"d").toLowerCase();
const completeMention=(content:string,value:string)=>{
  const escaped=value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}_-])${escaped}(?![\\p{L}\\p{N}_-])`,"iu").test(content);
};
export function carefulMockCoordinator({message,tasks}:TrackingAiInput):TrackingAiProposal {
  const text=normalized(message.content);
  if(/bo qua (quy tac|chi dan)|ignore .*instructions?|system prompt|tu dong.*done/.test(text))return {intent:"discussion"};
  const targets=message.taskId?tasks.filter(t=>t.id===message.taskId):tasks.filter(t=>completeMention(message.content,t.id)||completeMention(message.content,t.title));
  if(/xong roi|da xong|hoan thanh/.test(text))return {intent:"discussion"};
  if(/chua bat dau|khong bi (chan|loi)|khong con (loi|bi chan)/.test(text))return {intent:"discussion"};
  const blocked=/bi chan|ket|vuong|loi|cho /.test(text),started=/bat dau|dang lam|tien hanh|dang trien khai/.test(text);
  if(!blocked&&!started)return {intent:"discussion"};
  if(targets.length!==1)return {intent:"clarify",clarificationQuestion:"Bạn muốn cập nhật công việc nào? Vui lòng chọn một công việc cụ thể và nêu tình hình hoặc trở ngại."};
  if(blocked){
    const reason=/(?:vi|do|cho)\s+\S.{5,}/.test(text);
    if(!reason)return {intent:"clarify",clarificationQuestion:"Trở ngại cụ thể là gì và bạn đang cần hỗ trợ điều gì? Nội dung hiện tại chưa đủ để ghi nhận trạng thái bị chặn."};
    return {intent:"update",taskId:targets[0].id,requestedStatus:"blocked",blocker:message.content};
  }
  return {intent:"update",taskId:targets[0].id,requestedStatus:"in_progress"};
}

/** A conservative rehearsal check. A repeated criterion or a keyword alone is not evidence. */
export function carefulMockReviewer({submission}:ReviewAiInput):ReviewAiProposal {
  const headers=[...submission.content.matchAll(/^#{1,6}\s+(.+)$/gm)];
  const results=submission.criteriaSnapshot.map(criterion=>{
    const index=headers.findIndex(h=>normalized(h[1].trim())===normalized(criterion.text.trim()));
    const header=index<0?undefined:headers[index];
    const start=header?.index??0,end=index>=0?(headers[index+1]?.index??submission.content.length):0;
    const evidenceBody=header?submission.content.slice(start+header[0].length,end).trim():"";
    const supported=evidenceBody.length>=60&&/bang chung|ket qua|kiem tra|kiem thu|log|ma nguon|da trien khai/.test(normalized(evidenceBody));
    return {criterionId:criterion.id,verdict:supported?"met" as const:"insufficient_evidence" as const,
      evidence:supported?[{submissionId:submission.id,quote:submission.content.slice(start,end).trim()}]:[],
      missing:supported?"":`Chưa tìm thấy phần đối chiếu có bằng chứng cụ thể cho tiêu chí: ${criterion.text}`,
      suggestion:supported?"Đây là đối chiếu mẫu theo cấu trúc. Người nghiệm thu cần kiểm tra nội dung và bằng chứng trước khi xác nhận.":"Trong chế độ mẫu, dùng một tiêu đề Markdown trùng tiêu chí và bổ sung bên dưới kết quả, cách kiểm tra cùng bằng chứng cụ thể. Không chỉ chép lại tiêu chí hoặc khẳng định đã xong."};
  });
  const count=results.filter(r=>r.verdict==="met").length;
  return {results,summary:`Đối chiếu mẫu: tìm thấy phần trình bày bằng chứng cho ${count}/${results.length} tiêu chí. Đây là kiểm tra cấu trúc phục vụ diễn tập, không thay cho đánh giá ngữ nghĩa và quyết định của người nghiệm thu.`};
}
