import { requireSession } from "@/server/auth";
import { endpoint, readJson } from "@/server/http/errors";
import { respondInvitationSchema } from "@/features/planning/invitations";
import { respondToProjectInvitation } from "@/features/planning/server/invitations";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ invitationId: string }> }) {
  return endpoint(async () => {
    const session = await requireSession();
    const { invitationId } = await context.params;
    return respondToProjectInvitation(session, invitationId, await readJson(request, respondInvitationSchema));
  });
}
