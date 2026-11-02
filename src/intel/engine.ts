import { AGENTS, type AgentContext } from "./agents";
import { fuse } from "./fusion";
import { propagate } from "./impact";
import { SharedCache, fxRates } from "./sources";
import type { AgentState, IntelSnapshot, Signal } from "./types";

const CONCURRENCY = 8;
const AGENT_TIMEOUT_MS = 20_000;
export const SNAPSHOT_TTL_MS = 10 * 60_000;

interface EngineMemory {
  snapshot?: IntelSnapshot;
  inflight?: Promise<IntelSnapshot>;
  previousFx?: Record<string, number>;
}

// Survives hot reloads in dev and is reused across requests on a warm server.
const mem: EngineMemory = ((globalThis as { __intelSwarm?: EngineMemory }).__intelSwarm ??= {});

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

async function sweep(): Promise<IntelSnapshot> {
  const started = Date.now();
  const cache = new SharedCache();
  const ctx: AgentContext = { cache, previousFx: mem.previousFx };
  const states = new Map<string, AgentState>();
  const signals: Signal[] = [];

  await pool(AGENTS, CONCURRENCY, async (agent) => {
    const t0 = Date.now();
    const base = {
      id: agent.id,
      callsign: agent.callsign,
      country: agent.country,
      domain: agent.domain,
      role: agent.role,
      sources: agent.sources,
    };
    if (agent.domain === "fusion") {
      states.set(agent.id, { ...base, status: "ok", signalCount: 0 });
      return;
    }
    try {
      const out = await withTimeout(agent.run(ctx), AGENT_TIMEOUT_MS);
      signals.push(...out);
      states.set(agent.id, {
        ...base,
        status: out.length ? "ok" : "empty",
        lastRun: new Date().toISOString(),
        durationMs: Date.now() - t0,
        signalCount: out.length,
      });
    } catch (e) {
      states.set(agent.id, {
        ...base,
        status: "error",
        lastRun: new Date().toISOString(),
        durationMs: Date.now() - t0,
        signalCount: 0,
        error: e instanceof Error ? (e.cause instanceof Error ? `${e.message}: ${e.cause.message}` : e.message) : String(e),
      });
    }
  });

  try {
    mem.previousFx = (await fxRates(cache)).rates;
  } catch {
    /* keep the old baseline */
  }

  // Drop duplicate stories picked up by more than one agent in the same country, keeping the higher severity.
  const deduped = new Map<string, Signal>();
  for (const s of signals) {
    const key = `${s.country}|${s.url || s.title}`;
    const prev = deduped.get(key);
    if (!prev || s.severity > prev.severity) deduped.set(key, s);
  }
  // Agents coordinate on consequences: project knock-on effects, check the shared
  // blackboard, and task target agents with follow-up collection.
  const blackboard = [...deduped.values()];
  const impact = await propagate(blackboard, AGENTS, { followUps: true });
  for (const s of impact.followUpSignals) {
    const key = `${s.country}|${s.url || s.title}`;
    if (!deduped.has(key)) deduped.set(key, s);
    const st = states.get(s.agentId);
    if (st) {
      st.signalCount++;
      if (st.status === "empty") st.status = "ok";
    }
  }
  const finalSignals = [...deduped.values()].sort(
    (a, b) => b.severity - a.severity || new Date(b.time).getTime() - new Date(a.time).getTime(),
  );

  const fused = fuse(finalSignals, AGENTS, impact.chains);
  const { alerts, countries, regionalBrief } = fused;
  const messages = [...fused.messages, ...impact.messages];
  const agents = AGENTS.map((a) => states.get(a.id)!);
  for (const c of countries) {
    const collectors = agents.filter((a) => a.country === c.country && a.domain !== "fusion");
    const live = collectors.filter((a) => a.status !== "error").length;
    // A fusion lead is only "online" if it actually has collectors feeding it.
    const lead = agents.find((a) => a.country === c.country && a.domain === "fusion")!;
    lead.status = live ? "ok" : "error";
    lead.error = live ? undefined : "No collector input — all sources unreachable";
    lead.signalCount = finalSignals.filter((s) => s.country === c.country).length;
    c.agentsOk = live + (live ? 1 : 0);
  }
  const online = agents.filter((a) => a.status !== "error").length;
  if (online < 50) {
    regionalBrief.unshift(
      `DEGRADED: only ${online}/100 agents could reach their sources, so risk scores are incomplete. Check outbound network access to the data sources.`,
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    agents,
    signals: finalSignals,
    alerts,
    messages,
    chains: impact.chains,
    countries,
    regionalBrief,
  };
}

/** Returns the cached picture, or runs a new sweep of all 100 agents. */
export async function getSnapshot(force = false): Promise<IntelSnapshot> {
  const fresh = mem.snapshot && Date.now() - new Date(mem.snapshot.generatedAt).getTime() < SNAPSHOT_TTL_MS;
  if (fresh && !force) return mem.snapshot!;
  mem.inflight ??= sweep()
    .then((s) => (mem.snapshot = s))
    .finally(() => (mem.inflight = undefined));
  return mem.inflight;
}
