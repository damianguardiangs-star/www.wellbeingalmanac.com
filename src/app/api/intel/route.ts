import { getSnapshot } from "@/intel/engine";

// A full sweep of 100 agents can take a while on a cold start.
export const maxDuration = 120;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const snapshot = await getSnapshot(force);
  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
