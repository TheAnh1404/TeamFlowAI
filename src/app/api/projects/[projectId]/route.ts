import { endpoint, readJson, assertSameOrigin } from "@/server/http/errors";
import { requireSession } from "@/server/auth";
import { planningService } from "@/features/planning/server/implementation";
import * as c from "@/contracts";
export async function GET(request: Request, context: {
    params: Promise<{
        projectId: string;
    }>;
}) { return endpoint(async () => { const p = await context.params; const session = await requireSession(); return planningService().getProject(session, c.idSchema.parse(p.projectId)); }); }
export async function PATCH(request: Request, context: {
    params: Promise<{
        projectId: string;
    }>;
}) { return endpoint(async () => { const p = await context.params; assertSameOrigin(request); const session = await requireSession(); return planningService().updateProject(session, c.idSchema.parse(p.projectId), await readJson(request, c.updateProjectInputSchema)); }); }
