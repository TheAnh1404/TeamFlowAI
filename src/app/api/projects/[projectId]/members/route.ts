import { endpoint, readJson, assertSameOrigin } from "@/server/http/errors";
import { requireSession } from "@/server/auth";
import { planningService } from "@/features/planning/server/implementation";
import { getMembers } from "@/features/tracking/server/handlers";
import * as c from "@/contracts";

export const GET = getMembers;

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      projectId: string;
    }>;
  }
) {
  return endpoint(async () => {
    const p = await context.params;
    assertSameOrigin(request);
    const session = await requireSession();
    return planningService().addProjectMember(
      session,
      c.idSchema.parse(p.projectId),
      await readJson(request, c.addProjectMemberInputSchema)
    );
  });
}
