/**
 * Trend analysis over stored sweeps: how each country's risk is moving, which
 * disciplines are escalating against their own 24-hour baseline, how long alerts
 * have been running, and what has resolved.
 */
import { COUNTRIES, DOMAIN_LABEL, DOMAIN_WEIGHT } from "./config";
import { COUNTRY_CENTROID } from "./gazetteer";
import { SEVERITY_POINTS, hash } from "./analysis";
import type { SweepRecord, StoreInfo } from "./history";
import type {
  BusMessage,
  CountryCode,
  CountryPicture,
  CountryTrend,
  Domain,
  FusedAlert,
  ImpactChain,
  Severity,
  Signal,
  Trends,
} from "./types";

const DAY_MS = 24 * 3_600_000;
const MAX_POINTS = 120;

export function domainScores(signals: Signal[]): SweepRecord["domains"] {
  const out = Object.fromEntries(COUNTRIES.map((c) => [c.code, {}])) as SweepRecord["domains"];
  for (const s of signals) {
    if (s.domain === "fusion") continue;
    const d = out[s.country];
    d[s.domain] = Math.round(((d[s.domain] ?? 0) + SEVERITY_POINTS[s.severity] * DOMAIN_WEIGHT[s.domain]) * 10) / 10;
  }
  return out;
}

export function buildRecord(
  t: string,
  online: number,
  signals: Signal[],
  countries: CountryPicture[],
  alerts: FusedAlert[],
  chains: ImpactChain[],
): SweepRecord {
  return {
    t,
    online,
    signals: signals.length,
    risk: Object.fromEntries(countries.map((c) => [c.country, c.risk])) as Record<CountryCode, number>,
    inbound: Object.fromEntries(countries.map((c) => [c.country, c.inbound])) as Record<CountryCode, number>,
    domains: domainScores(signals),
    alerts: alerts.slice(0, 40).map((a) => ({ id: a.id, sev: a.severity, headline: a.headline, countries: a.countries })),
    chains: chains.map((c) => ({
      id: c.id,
      event: c.event,
      from: c.from,
      sev: c.severity,
      verified: c.impacts.filter((i) => i.status === "observed" || i.status === "confirmed").length,
      total: c.impacts.length,
    })),
  };
}

function downsample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = (arr.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)]);
}

/**
 * @param current  record for the sweep that just ran
 * @param history  previously stored records, newest first (not including `current`)
 */
export function computeTrends(current: SweepRecord, history: SweepRecord[], store: StoreInfo) {
  const now = new Date(current.t).getTime();
  // Ignore sweeps where most agents were offline: they would read as false "drops".
  const usable = history.filter((r) => r.online >= 50);
  const chronological = [...usable].reverse();
  const last24 = usable.filter((r) => now - new Date(r.t).getTime() <= DAY_MS);
  const ref24 = usable.find((r) => now - new Date(r.t).getTime() >= DAY_MS * 0.9) ?? usable[usable.length - 1];
  const prev = usable[0];

  const messages: BusMessage[] = [];
  const alerts: FusedAlert[] = [];
  const escalations: string[] = [];

  const countries: CountryTrend[] = COUNTRIES.map((c) => {
    const code = c.code;
    const series = downsample(
      [...chronological.filter((r) => now - new Date(r.t).getTime() <= 7 * DAY_MS), current].map((r) => ({
        t: r.t,
        risk: r.risk[code] ?? 0,
      })),
      MAX_POINTS,
    );
    const nowRisk = current.risk[code] ?? 0;
    const delta24h = ref24 ? nowRisk - (ref24.risk[code] ?? 0) : null;
    const deltaLast = prev ? nowRisk - (prev.risk[code] ?? 0) : null;

    let streak = 0;
    let after = nowRisk;
    for (const r of usable) {
      const before = r.risk[code] ?? 0;
      const dir = Math.sign(after - before);
      if (dir === 0 || (streak !== 0 && dir !== Math.sign(streak))) break;
      streak += dir;
      after = before;
    }

    const escalating: CountryTrend["escalating"] = [];
    if (last24.length >= 3) {
      const domains = new Set<Domain>([
        ...(Object.keys(current.domains[code] ?? {}) as Domain[]),
        ...last24.flatMap((r) => Object.keys(r.domains[code] ?? {}) as Domain[]),
      ]);
      for (const d of domains) {
        const nowScore = current.domains[code]?.[d] ?? 0;
        const baseline = last24.reduce((n, r) => n + (r.domains[code]?.[d] ?? 0), 0) / last24.length;
        if (nowScore >= Math.max(baseline * 1.5, baseline + 6) && nowScore >= 8) {
          escalating.push({ domain: d, now: nowScore, baseline: Math.round(baseline * 10) / 10, ratio: baseline ? nowScore / baseline : Infinity });
        }
      }
      escalating.sort((a, b) => b.now - b.baseline - (a.now - a.baseline));
    }

    const lead = `${code}-LEAD`;
    if (delta24h !== null && delta24h >= 15) {
      const sev: Severity = delta24h >= 25 ? 3 : 2;
      const line = `${c.name} risk up ${delta24h} points in 24h (now ${nowRisk}/100${streak > 1 ? `, rising ${streak} sweeps running` : ""}).`;
      escalations.push(line);
      alerts.push({
        id: hash(`trend|${code}`), // stable, so a running trend reads as ongoing rather than new each hour
        countries: [code],
        domains: escalating.slice(0, 3).map((e) => e.domain),
        severity: sev,
        headline: `Trend: ${line}`,
        rationale: escalating.length
          ? `Driven by ${escalating.map((e) => `${DOMAIN_LABEL[e.domain]} (${e.now} vs 24h baseline ${e.baseline})`).join(", ")}.`
          : "Broad-based increase across disciplines.",
        signalIds: [],
        agents: [lead],
        time: current.t,
        lat: COUNTRY_CENTROID[code][0],
        lon: COUNTRY_CENTROID[code][1],
        geo: "country",
      });
    }
    for (const e of escalating.slice(0, 3)) {
      const line = `${c.name}: ${DOMAIN_LABEL[e.domain]} escalating — score ${e.now} vs 24h baseline ${e.baseline}.`;
      escalations.push(line);
      messages.push({
        id: hash(`tr|${code}|${e.domain}|${current.t}`),
        time: current.t,
        from: "SEA-HQ",
        to: `${code}-${roleCode(e.domain)}`,
        kind: "trend",
        text: `Your discipline is running ${e.ratio === Infinity ? "well" : e.ratio.toFixed(1) + "×"} above its 24h baseline. Increase attention and report changes.`,
        signalIds: [],
      });
    }
    if (delta24h !== null && Math.abs(delta24h) >= 10) {
      messages.push({
        id: hash(`trl|${code}|${current.t}`),
        time: current.t,
        from: "SEA-HQ",
        to: lead,
        kind: "trend",
        text: `${c.name} risk ${delta24h > 0 ? "up" : "down"} ${Math.abs(delta24h)} pts in 24h${escalating.length ? `; escalating: ${escalating.map((e) => DOMAIN_LABEL[e.domain]).join(", ")}` : ""}.`,
        signalIds: [],
      });
    }
    return { country: code, series, delta24h, deltaLast, streak, escalating };
  });

  // Alert & chain persistence.
  const firstSeen = (id: string, key: "alerts" | "chains") => {
    let seen: string | null = null;
    for (const r of usable) {
      if ((r[key] as { id: string }[]).some((x) => x.id === id)) seen = r.t;
      else break; // must be continuous
    }
    return seen;
  };
  const alertAge: Trends["alertAge"] = {};
  for (const a of current.alerts) {
    const f = firstSeen(a.id, "alerts");
    alertAge[a.id] = { firstSeen: f ?? current.t, isNew: !f && usable.length > 0 };
  }
  const chainAge: Trends["chainAge"] = {};
  for (const ch of current.chains) {
    const f = firstSeen(ch.id, "chains");
    chainAge[ch.id] = { firstSeen: f ?? current.t, isNew: !f && usable.length > 0 };
  }
  const currentIds = new Set(current.alerts.map((a) => a.id));
  const resolved = prev
    ? prev.alerts.filter((a) => a.sev >= 2 && !currentIds.has(a.id)).slice(0, 8).map((a) => ({ headline: a.headline, sev: a.sev, lastSeen: prev.t }))
    : [];

  const trends: Trends = {
    sweeps: usable.length + 1,
    since: chronological[0]?.t ?? null,
    store,
    countries,
    alertAge,
    chainAge,
    resolved,
    escalations,
  };
  return { trends, alerts, messages };
}

const ROLE_CODE: Partial<Record<Domain, string>> = {
  weather: "WX", air: "AQ", seismic: "SEI", disaster: "DIS", crime: "CRM", security: "SEC", politics: "POL",
  geopolitics: "GEO", unrest: "UNR", commodities: "COM", currency: "FX", maritime: "MAR", aviation: "AVN",
  advisory: "ADV", students: "STU", health: "HLT", economy: "ECO", cyber: "CYB", infrastructure: "INF",
};
const roleCode = (d: Domain) => ROLE_CODE[d] ?? "LEAD";

export function trendBriefLines(trends: Trends, code: CountryCode): string[] {
  const t = trends.countries.find((c) => c.country === code);
  if (!t || trends.sweeps < 2) return [];
  const parts: string[] = [];
  if (t.delta24h !== null) parts.push(`24h change: ${t.delta24h >= 0 ? "+" : ""}${t.delta24h}`);
  if (Math.abs(t.streak) > 1) parts.push(`${t.streak > 0 ? "rising" : "falling"} ${Math.abs(t.streak)} sweeps running`);
  if (t.escalating.length) parts.push(`escalating: ${t.escalating.map((e) => DOMAIN_LABEL[e.domain]).join(", ")}`);
  return parts.length ? [`Trend — ${parts.join("; ")}.`] : [];
}

