export const runtime = "nodejs";

import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { projectMembers, users } from "@/server/db/schema";
import { requireSession } from "@/server/auth";
import { endpoint } from "@/server/http/errors";

export const GET = () =>
  endpoint(async () => {
    const session = await requireSession();
    const db = getDb();
    const actorId = session.user.id;

    // 1. Tìm các project mà actor đang tham gia
    const actorMemberships = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, actorId));

    const projectIds = actorMemberships.map((m) => m.projectId);

    const allowedUserIds = new Set<string>([actorId]);

    // 2. Nếu có dự án, lấy danh sách các user cùng tham gia ít nhất 1 dự án với actor
    if (projectIds.length > 0) {
      const coMembers = await db
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .where(inArray(projectMembers.projectId, projectIds));

      for (const m of coMembers) {
        allowedUserIds.add(m.userId);
      }
    }

    // 3. Trả về danh sách User hợp lệ (chỉ gồm id, displayName, createdAt; không có email hay credential)
    const resultUsers = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(inArray(users.id, Array.from(allowedUserIds)));

    return resultUsers;
  });
