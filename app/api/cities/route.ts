import { serveFile } from "@/lib/data-endpoint";

/** The cities index (`cities.json`) — same ETag/304 contract as the tiers. */
export async function GET(request: Request): Promise<Response> {
  return serveFile("cities.json", "application/json", request);
}
