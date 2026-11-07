import { endpoint, readJson, assertSameOrigin } from "@/server/http/errors";
import { requireSession } from "@/server/auth";
import { planningService } from "@/features/planning/server/implementation";
import { getProjects } from "@/features/tracking/server/handlers";
import * as c from "@/contracts";

export const GET = getProjects;

export async function POST(request: Request) {
  return endpoint(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    return planningService().createProject(
      session,
      await readJson(request, c.createProjectInputSchema)
    );
  });
}
