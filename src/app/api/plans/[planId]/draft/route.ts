import { endpoint, readJson, assertSameOrigin } from "@/server/http/errors";
import { requireSession } from "@/server/auth";
import { planningService } from "@/features/planning/server/implementation";
import * as c from "@/contracts";
export async function PATCH(request: Request, context: {
    params: Promise<{
        planId: string;
    }>;
}) { return endpoint(async () => { const p = await context.params; assertSameOrigin(request); const session = await requireSession(); return planningService().updatePlanDraft(session, c.idSchema.parse(p.planId), await readJson(request, c.updatePlanDraftInputSchema)); }); }
