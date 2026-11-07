import { projectHandler } from "@/server/automation/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = projectHandler("meetings");
export const POST = projectHandler("meetings");
