import { endpoint, assertSameOrigin } from "@/server/http/errors";
import { requireSession } from "@/server/auth";
import { planningService } from "@/features/planning/server/implementation";
import * as c from "@/contracts";
export async function GET(request: Request, context: {
    params: Promise<{
        projectId: string;
    }>;
}) { return endpoint(async () => { const p = await context.params; const session = await requireSession(); return planningService().getPlan(session, c.idSchema.parse(p.projectId)); }); }
export async function POST(request: Request, context: {
    params: Promise<{
        projectId: string;
    }>;
}) { return endpoint(async () => { const p = await context.params; assertSameOrigin(request); const session = await requireSession(); return planningService().generatePlanDraft(session, c.idSchema.parse(p.projectId)); }); }
