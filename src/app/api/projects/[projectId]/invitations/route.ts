import { requireSession } from "@/server/auth";
import { endpoint, readJson } from "@/server/http/errors";
import { inviteProjectMemberSchema } from "@/features/planning/invitations";
import { invitationCandidates, listOutgoingProjectInvitations, sendProjectInvitation } from "@/features/planning/server/invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return endpoint(async () => {
    const session = await requireSession();
    const { projectId } = await context.params;
    const search = new URL(request.url).searchParams.get("search");
    return search ? invitationCandidates(session, projectId, search) : listOutgoingProjectInvitations(session, projectId);
  });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return endpoint(async () => {
    const session = await requireSession();
    const { projectId } = await context.params;
    return sendProjectInvitation(session, projectId, await readJson(request, inviteProjectMemberSchema));
  });
}
