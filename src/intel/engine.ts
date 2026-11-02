import { AGENTS, type AgentContext } from "./agents";
import { fuse } from "./fusion";
import { propagate } from "./impact";
import { SharedCache, fxRates, searchNews } from "./sources";
import { getStore, type SweepRecord } from "./history";
import { buildRecord, computeTrends, trendBriefLines } from "./trends";
import { runAnalyst } from "./analyst";
import { extractTags, hash, hoursAgo, scoreHeadline } from "./analysis";
import { geocode } from "./gazetteer";
import { COUNTRY_BY_CODE } from "./config";
import type { AgentState, AnalystAssessment, BusMessage, IntelSnapshot, Signal } from "./types";

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

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.warn("[intel]", e instanceof Error ? e.message : e);
    return fallback;
  }
}

/** Run the AI analyst's collection requests from the previous assessment. */
async function runTaskings(previous: AnalystAssessment | null, states: Map<string, AgentState>) {
  const signals: Signal[] = [];
  const messages: BusMessage[] = [];
  const now = new Date().toISOString();
  for (const gap of previous?.collection_gaps ?? []) {
    const agent = AGENTS.find((a) => a.country === gap.country && a.domain === gap.domain);
    if (!agent) continue;
    const c = COUNTRY_BY_CODE[gap.country];
    const query = gap.search_query.toLowerCase().includes(c.name.toLowerCase()) ? gap.search_query : `${c.name} ${gap.search_query}`;
    try {
      const { items, provider } = await searchNews(query);
      const hits = items.filter((it) => hoursAgo(it.published) <= 72).slice(0, 2);
      for (const it of hits) {
        signals.push({
          id: hash(`${agent.id}|task|${it.link}`),
          agentId: agent.id,
          country: agent.country,
          domain: agent.domain,
          severity: scoreHeadline(it.title),
          title: it.title,
          url: it.link,
          source: `${it.source} via ${provider} (analyst tasking)`,
          time: it.published,
          tags: [...extractTags(it.title, c), "analyst-tasking"],
          ...geocode(it.title, agent.country),
        });
      }
      const st = states.get(agent.id);
      if (st && hits.length) {
        st.signalCount += hits.length;
        if (st.status === "empty") st.status = "ok";
      }
      messages.push({
        id: hash(`tk|${agent.id}|${gap.search_query}|${now}`),
        time: now,
        from: agent.callsign,
        to: "SEA-ANALYST",
        kind: hits.length ? "confirm" : "no-evidence",
        text: hits.length
          ? `Tasking "${gap.request.slice(0, 80)}": found ${hits.length} item(s), e.g. ${hits[0].title.slice(0, 90)}`
          : `Tasking "${gap.request.slice(0, 80)}": nothing found for "${query}".`,
        signalIds: [],
      });
    } catch {
      /* source down — the agent's own status already reflects that */
    }
  }
  return { signals, messages };
}

async function sweep(): Promise<IntelSnapshot> {
  const started = Date.now();
  const store = getStore();
  const previousAnalyst = await safe(store.getMeta<AnalystAssessment>("analyst"), null);
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

  // Collection requested by the AI analyst last time round.
  const taskings = await runTaskings(previousAnalyst, states);
  signals.push(...taskings.signals);

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
  const messages = [...fused.messages, ...impact.messages, ...taskings.messages];
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

  // Trends: compare this sweep with stored history.
  const generatedAt = new Date().toISOString();
  const history = await safe(store.list(800), [] as SweepRecord[]);
  const record = buildRecord(generatedAt, online, finalSignals, countries, alerts, impact.chains);
  const trend = computeTrends(record, history, store.info);
  alerts.push(...trend.alerts);
  alerts.sort((a, b) => b.severity - a.severity || b.signalIds.length - a.signalIds.length);
  messages.push(...trend.messages);
  for (const c of countries) c.brief.splice(1, 0, ...trendBriefLines(trend.trends, c.country));
  if (trend.trends.escalations.length) regionalBrief.push(...trend.trends.escalations.slice(0, 3).map((l) => `Trend: ${l}`));

  // AI analyst (rate-limited; falls back to rule-based interpretations).
  const ai = await runAnalyst({ signals: finalSignals, alerts, chains: impact.chains, countries, trends: trend.trends }, generatedAt, previousAnalyst);
  if (ai.status.state === "ok" && ai.assessment) await safe(store.setMeta("analyst", ai.assessment), undefined);
  if (ai.status.state === "ok") {
    for (const g of ai.assessment?.collection_gaps ?? []) {
      const target = AGENTS.find((a) => a.country === g.country && a.domain === g.domain);
      messages.push({
        id: hash(`gap|${g.country}|${g.domain}|${g.search_query}|${generatedAt}`),
        time: generatedAt,
        from: "SEA-ANALYST",
        to: target?.callsign ?? `${g.country}-LEAD`,
        kind: "tasking",
        text: `${g.request} — will search next sweep: "${g.search_query}"`,
        signalIds: [],
      });
    }
  }

  record.alerts = buildRecord(generatedAt, online, finalSignals, countries, alerts, impact.chains).alerts;
  await safe(store.append(record), undefined);

  return {
    generatedAt,
    durationMs: Date.now() - started,
    agents,
    signals: finalSignals,
    alerts,
    messages,
    chains: impact.chains,
    countries,
    regionalBrief,
    trends: trend.trends,
    analyst: ai.assessment,
    analystStatus: ai.status,
  };
}

/** Returns the cached picture, or runs a new sweep of all 100 agents. */
export async function getSnapshot(force = false): Promise<IntelSnapshot> {
  const age = mem.snapshot ? Date.now() - new Date(mem.snapshot.generatedAt).getTime() : Infinity;
  // A forced refresh is honoured at most every 2 minutes so the button can't hammer sources or the AI.
  if (age < SNAPSHOT_TTL_MS && !(force && age > 2 * 60_000)) return mem.snapshot!;
  mem.inflight ??= sweep()
    .then((s) => (mem.snapshot = s))
    .finally(() => (mem.inflight = undefined));
  return mem.inflight;
}
