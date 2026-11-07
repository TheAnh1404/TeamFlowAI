import "server-only";
import type { ProjectMember, User } from "@/contracts";
import { sessionProvider } from "@/server/auth";
import type { Session } from "@/server/auth/contracts";
import { HttpError } from "@/server/http/errors";

export async function getDeliverySession(request: Request): Promise<Session> {
  // 1. Luôn thử lấy session thật từ TV2 (Cookie auth)
  try {
    const session = await sessionProvider.getCurrentSession();
    if (session) return session;
  } catch {
    // Không ném lỗi nếu chỉ thiếu kết nối DB trong lúc dev offline
  }

  // 2. Chặn hoàn toàn fallback giả lập ở môi trường Production nếu không bật ENABLE_DEMO_AUTH
  const isDemoAllowed = process.env.ENABLE_DEMO_AUTH === "true" || process.env.NODE_ENV !== "production";
  if (!isDemoAllowed) {
    throw new HttpError(401, "UNAUTHENTICATED", "Bạn cần đăng nhập phiên làm việc để tiếp tục.");
  }

  // 3. Fallback demo session cho môi trường Dev / Standalone testing khi chưa cấu hình DB
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

