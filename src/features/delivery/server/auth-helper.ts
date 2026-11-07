import "server-only";
import type { ProjectMember, User } from "@/contracts";
import { sessionProvider } from "@/server/auth";
import type { Session } from "@/server/auth/contracts";
import { FeatureNotImplementedError } from "@/server/http/feature-not-implemented-error";

export async function getDeliverySession(request: Request): Promise<Session> {
  try {
    const session = await sessionProvider.getCurrentSession();
    if (session) return session;
  } catch (err: unknown) {
    if (!(err instanceof FeatureNotImplementedError)) {
      throw err;
    }
  }

  // Fallback demo session cho phiên làm việc độc lập của TV3 trước khi TV2 hoàn tất auth
  // Hỗ trợ kiểm thử chuyển đổi vai trò qua header x-demo-role hoặc query ?demoRole=leader|member
  const url = new URL(request.url);
  const requestedRole = (request.headers.get("x-demo-role") || url.searchParams.get("demoRole") || "leader") as "leader" | "member";
  const canAcceptParam = request.headers.get("x-demo-can-accept") || url.searchParams.get("demoCanAccept");
  const canAccept = canAcceptParam !== null ? canAcceptParam === "true" : requestedRole === "leader";

  const fallbackUser: User = {
    id: "u3",
    displayName: "Lê Thành Viên 3 (TV3)",
    createdAt: new Date().toISOString(),
  };

  const fallbackMemberships: ProjectMember[] = [
    {
      id: "m1",
      projectId: "p1",
      userId: "u3",
      role: requestedRole,
      canAccept,
      skills: ["Delivery", "AI", "Testing"],
      availableHoursPerWeek: 40,
    },
    {
      id: "m2",
      projectId: "p1",
      userId: "u2",
      role: "member",
      canAccept: false,
      skills: ["Frontend", "Design"],
      availableHoursPerWeek: 35,
    },
  ];

  return {
    user: fallbackUser,
    memberships: fallbackMemberships,
  };
}

