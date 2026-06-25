import { connection } from "next/server";

// Lightweight liveness endpoint for external uptime monitoring (Sentry Uptime).
// `connection()` opts the handler out of static prerendering under
// `cacheComponents`, so each hit runs on the live deployment — a 200 means
// "this deployment is serving" without paying for the heavy PPR + WebGL homepage.
export async function GET(): Promise<Response> {
  await connection();
  return Response.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}
