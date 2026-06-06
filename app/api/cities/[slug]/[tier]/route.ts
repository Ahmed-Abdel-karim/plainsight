import { serveTier } from "@/lib/data-endpoint";

/**
 * Serves a per-city data tier (`/api/cities/{slug}/{tier}`) from the server-only
 * `data/cities/` store. Dynamic by default (reads request headers for the
 * conditional `If-None-Match` check); `serveTier` owns the allowlist + ETag/304.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; tier: string }> },
): Promise<Response> {
  const { slug, tier } = await params;
  return serveTier(slug, tier, request);
}
