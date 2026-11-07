import "server-only";
import { z } from "zod";
import { aiProvider } from "@/server/ai";
import type { AiProvider, PlanningAiInput } from "@/server/ai/contracts";
import { HttpError } from "@/server/http/errors";
import { FeatureNotImplementedError } from "@/server/http/feature-not-implemented-error";
import { detailedMockPlanner } from "@/server/ai/planner-mock";
import {currentAiOverride} from "@/server/ai/context";
const proposalSchema = z.object({ tasks: z.array(z.object({
        tempKey: z.string().min(1).max(128), title: z.string().min(1).max(200), description: z.string().max(4000),
        assigneeMemberId: z.string().min(1), deadline: z.iso.datetime({ offset: true }),
        criteria: z.array(z.string().trim().min(1).max(1000)).min(1).max(10), dependencyTempKeys: z.array(z.string()).max(30),
        steps: z.array(z.string().trim().min(1).max(1000)).min(1).max(10).optional(),
        assignmentReason: z.string().trim().min(1).max(1500).optional(), estimatedHours: z.number().positive().max(168).optional(),
    })).min(1).max(30) });
export function createPlanner(provider: AiProvider = aiProvider, mode = process.env.PLANNING_AI_MODE, timeoutMs = 20000) {
    return async (input: PlanningAiInput) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const effectiveMode=currentAiOverride()?.mode??mode;
            const operation=effectiveMode==="mock"?Promise.resolve({proposal:detailedMockPlanner(input),aiMode:"mock" as const}):provider.generate("planner", input);
            const result = await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new HttpError(504, "AI_TIMEOUT", "Planner quá thời gian. Dữ liệu dự án vẫn được giữ; hãy thử lại.")), timeoutMs); })]);
            const parsed = proposalSchema.safeParse(result.proposal);
            if (!parsed.success || !["real", "mock"].includes(result.aiMode))
                throw new HttpError(502, "AI_INVALID_OUTPUT", "Planner trả dữ liệu không hợp lệ.");
            const tasks=parsed.data.tasks.map(t=>{
                if(result.aiMode==="real"&&(!t.steps?.length||!t.assignmentReason||!t.estimatedHours))throw new HttpError(502,"AI_INVALID_OUTPUT","Planner chưa giải thích đầy đủ cách thực hiện, phân công hoặc ước lượng. Hãy thử lại.");
                const member=input.members.find(m=>m.id===t.assigneeMemberId);
                const proposed=parsed.data.tasks.filter(d=>d.assigneeMemberId===t.assigneeMemberId).reduce((n,d)=>n+(d.estimatedHours??0),0);
                const capacity=(member?.availableHoursPerWeek??0)*(Date.parse(input.project.deadline)-Date.parse(input.project.createdAt))/(7*86400000);
                const warning=member&&proposed>capacity?`Cảnh báo năng lực: tổng đề xuất ${proposed} giờ vượt khoảng ${Math.round(capacity*10)/10} giờ khả dụng đến hạn dự án. Cần trưởng nhóm thống nhất giảm phạm vi hoặc bổ sung hỗ trợ; Planner không tự đổi deadline.`:null;
                const description=[t.description,t.steps?.length?`Các bước thực hiện:\n${t.steps.map((s,i)=>`${i+1}. ${s}`).join("\n")}`:null,t.assignmentReason?`Lý do phân công: ${t.assignmentReason}`:null,t.estimatedHours?`Ước lượng đề xuất: ${t.estimatedHours} giờ — cần trưởng nhóm xác nhận.`:null,warning].filter(Boolean).join("\n\n");
                if(description.length>4000)throw new HttpError(502,"AI_INVALID_OUTPUT","Mô tả Planner vượt giới hạn. Hãy yêu cầu phạm vi rõ và ngắn hơn.");
                return {tempKey:t.tempKey,title:t.title,description,assigneeMemberId:t.assigneeMemberId,deadline:t.deadline,criteria:t.criteria,dependencyTempKeys:t.dependencyTempKeys};
            });
            return { proposal: {tasks}, aiMode: result.aiMode };
        }
        catch (e) {
            if (e instanceof HttpError || e instanceof FeatureNotImplementedError)
                throw e;
            throw new HttpError(502, "AI_UNAVAILABLE", "Chưa nhận được kế hoạch từ Planner. Hãy thử lại.");
        }
        finally {
            clearTimeout(timer);
        }
    };
}
