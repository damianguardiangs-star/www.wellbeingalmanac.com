import { getSnapshot } from "@/intel/engine";

// Called on a schedule (Vercel Cron, GitHub Actions, any cron) so the swarm keeps
// sweeping and building history 24/7 even when nobody has the dashboard open.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Set CRON_SECRET to enable scheduled sweeps." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const s = await getSnapshot(true);
  return Response.json({
    generatedAt: s.generatedAt,
    durationMs: s.durationMs,
    agentsOnline: s.agents.filter((a) => a.status !== "error").length,
    signals: s.signals.length,
    alerts: s.alerts.length,
    chains: s.chains.length,
    history: s.trends.store.note,
    analyst: s.analystStatus,
  });
}
