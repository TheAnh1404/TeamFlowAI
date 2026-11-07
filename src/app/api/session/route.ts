import { getSession as GET, postSession as POST, deleteSession as DELETE } from "@/features/tracking/server/handlers";

export const runtime = "nodejs";
export { GET, POST, DELETE };
