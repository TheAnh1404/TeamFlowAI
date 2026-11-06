// Health check route reflecting process readiness only.
// Does NOT claim database, Neon, or AI connectivity.
export function GET(): Response {
  return Response.json({
    status: "ok",
    app: "TeamFlow AI",
    timestamp: new Date().toISOString(),
  });
}
