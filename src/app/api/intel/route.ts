import { getSnapshot } from "@/intel/engine";

// A full sweep of 100 agents plus the AI analyst can take a couple of minutes.
export const maxDuration = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const snapshot = await getSnapshot(force);
  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
