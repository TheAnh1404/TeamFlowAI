import { endpoint, readJson, assertSameOrigin } from "@/server/http/errors";
import { requireSession } from "@/server/auth";
import { planningService } from "@/features/planning/server/implementation";
import * as c from "@/contracts";
export async function PATCH(request: Request, context: {
    params: Promise<{
        projectId: string;
        memberId: string;
    }>;
}) { return endpoint(async () => { const p = await context.params; assertSameOrigin(request); const session = await requireSession(); return planningService().updateProjectMember(session, c.idSchema.parse(p.projectId), c.idSchema.parse(p.memberId), await readJson(request, c.updateProjectMemberInputSchema)); }); }
