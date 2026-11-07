import { z } from "zod";
import { createProjectInputSchema } from "@/contracts/project";
export const intakeInputSchema=z.object({
  project:createProjectInputSchema,
  members:z.array(z.object({userId:z.string().min(1),skills:z.array(z.string().trim().min(1)).min(1).max(20),availableHoursPerWeek:z.number().positive().max(168)})).min(1).max(8),
});
export const intakeResultSchema=z.object({
  mode:z.literal("guided_review"),summary:z.string(),
  questions:z.array(z.object({id:z.string(),question:z.string(),hint:z.string()})),
  allocationNotes:z.array(z.string()),
});
export type IntakeResult=z.infer<typeof intakeResultSchema>;
export function reviewLeaderInput(input:z.infer<typeof intakeInputSchema>):IntakeResult {
  const questions:IntakeResult["questions"]=[];
  if(input.project.goal.trim().length<80)questions.push({id:"success",question:"Kết quả nào cho biết dự án đã thành công và ai sẽ xác nhận?",hint:"Nêu đối tượng sử dụng, hành vi cần thực hiện được và bằng chứng để kiểm tra."});
  questions.push({id:"scope",question:"Phạm vi bắt buộc và những phần sẽ để sau là gì?",hint:"Nêu việc phải có trong bản bàn giao, giới hạn công nghệ/nội dung và phần ngoài phạm vi."});
  questions.push({id:"constraints",question:"Nhóm đang có sẵn những gì và phụ thuộc hoặc rủi ro nào cần chú ý?",hint:"Ví dụ: mã nguồn, dữ liệu mẫu, quyền truy cập, công cụ, yêu cầu từ mentor. Nếu chưa biết, ghi rõ để Planner đánh dấu giả định."});
  return {mode:"guided_review",summary:`Đã ghi nhận ${input.project.deliverables.length} đầu ra và ${input.members.length} thành viên. Làm rõ các điểm dưới đây để đề xuất công việc sát với phạm vi và năng lực nhóm.`,questions,
    allocationNotes:[`Tổng giờ khả dụng: ${input.members.reduce((n,m)=>n+m.availableHoursPerWeek,0)} giờ/tuần.`,"Phân công dựa trên kỹ năng, khối lượng đã giao và giờ khả dụng; mỗi việc có một người chịu trách nhiệm.","Planner chỉ tạo nháp. Trưởng nhóm rà soát deadline, phụ thuộc, ước lượng và tiêu chí trước khi công bố."]};
}
