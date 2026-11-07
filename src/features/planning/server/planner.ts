import "server-only";
import { z } from "zod";
import { aiProvider } from "@/server/ai";
import type { AiProvider, PlanningAiInput } from "@/server/ai/contracts";
import { HttpError } from "@/server/http/errors";
import { FeatureNotImplementedError } from "@/server/http/feature-not-implemented-error";
const proposalSchema = z.object({ tasks: z.array(z.object({
        tempKey: z.string().min(1).max(128), title: z.string().min(1).max(200), description: z.string().max(4000),
        assigneeMemberId: z.string().min(1), deadline: z.iso.datetime({ offset: true }),
        criteria: z.array(z.string().trim().min(1).max(1000)).min(1).max(10), dependencyTempKeys: z.array(z.string()).max(30),
    })).min(1).max(30) });
export function createPlanner(provider: AiProvider = aiProvider, mode = process.env.PLANNING_AI_MODE, timeoutMs = 20000) {
    return async (input: PlanningAiInput) => {
        if (mode === "mock")
            return { aiMode: "mock" as const, proposal: { tasks: input.project.deliverables.map((d, i) => ({ tempKey: `draft-${i}`, title: d, description: `Thực hiện đầu ra: ${d}`, assigneeMemberId: input.members[i % input.members.length].id, deadline: input.project.deadline, criteria: [`Cung cấp ${d} để trưởng nhóm kiểm tra.`], dependencyTempKeys: [] })) } };
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const result = await Promise.race([provider.generate("planner", input), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new HttpError(504, "AI_TIMEOUT", "Planner quá thời gian. Dữ liệu dự án vẫn được giữ; hãy thử lại.")), timeoutMs); })]);
            const parsed = proposalSchema.safeParse(result.proposal);
            if (!parsed.success || !["real", "mock"].includes(result.aiMode))
                throw new HttpError(502, "AI_INVALID_OUTPUT", "Planner trả dữ liệu không hợp lệ.");
            return { proposal: parsed.data, aiMode: result.aiMode };
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
