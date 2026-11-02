/**
 * The fusion layer: how the agents talk to each other.
 *
 * 1. Every collector publishes its signals to the bus as a `report` to its country lead.
 * 2. Each country lead (XX-20) looks for corroboration — the same event tag reported by
 *    agents in different domains — and for known cause→effect chains (e.g. a storm
 *    agent + a shipping agent). It messages the agents involved and raises fused alerts.
 * 3. The regional HQ compares the five leads' pictures and raises cross-border alerts
 *    when the same tag is live in two or more countries, or a country's agents report on
 *    a neighbour.
 */
import { COUNTRIES, COUNTRY_BY_CODE, DOMAIN_LABEL, DOMAIN_WEIGHT } from "./config";
import { SEVERITY_POINTS, hash, hoursAgo } from "./analysis";
import type { Agent } from "./agents";
import {
  SEVERITY_LABEL,
  type BusMessage,
  type CountryCode,
  type CountryPicture,
  type Domain,
  type FusedAlert,
  type ImpactChain,
  type Severity,
  type Signal,
} from "./types";

const HAZARD: Domain[] = ["weather", "disaster", "seismic", "air"];
const MOBILITY: Domain[] = ["maritime", "aviation", "infrastructure"];
const TRAVELLER: Domain[] = ["students", "advisory"];
const STABILITY: Domain[] = ["unrest", "security", "politics"];

/** Cause → effect chains a lead actively checks for. */
const CHAINS: { cause: Domain[]; effect: Domain[]; minCause: Severity; headline: (c: string) => string; why: string }[] = [
  {
    cause: HAZARD,
    effect: MOBILITY,
    minCause: 2,
    headline: (c) => `${c}: natural hazard likely disrupting shipping / transport`,
    why: "Hazard agents and logistics agents are reporting on the same event or place.",
  },
  {
    cause: STABILITY,
    effect: TRAVELLER,
    minCause: 2,
    headline: (c) => `${c}: instability with traveller / student exposure`,
    why: "Unrest or security reporting overlaps with student-safety or advisory reporting.",
  },
  {
    cause: ["geopolitics", "economy"],
    effect: ["commodities", "maritime", "currency"],
    minCause: 2,
    headline: (c) => `${c}: geopolitical / trade pressure feeding into markets and routes`,
    why: "Geopolitical or trade-policy reporting shares tags with commodity, FX or shipping reporting.",
  },
  {
    cause: HAZARD,
    effect: ["health", "commodities"],
    minCause: 3,
    headline: (c) => `${c}: severe hazard with downstream health / crop impact`,
    why: "Severe hazard plus health or commodity reporting on the same event.",
  },
];

/** Tags too generic to prove two reports are about the same thing (plus internal bookkeeping tags). */
const WEAK_TAGS = new Set(["military", "students", "tourists", "flight", "port", "storm", "follow-up", "analyst-tasking", "strike"]);

/** Only these tags are specific enough to link reports in different countries to one event. */
/** Capitals appear in most national stories, so they prove nothing about two reports being linked. */
const CAPITAL_TAGS = new Set(COUNTRIES.map((c) => `place:${c.cities[0].name.toLowerCase()}`));

const CROSS_BORDER_TAG = (t: string) =>
  t.startsWith("storm:") || t === "south china sea" || t === "mekong" || t === "haze" || t === "typhoon";

let seq = 0;
const msgId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

const PRECISION = { exact: 2, place: 1, country: 0 } as const;

/** An alert sits where its most precisely located, most severe signal is. */
function locate(group: Signal[]): Pick<FusedAlert, "lat" | "lon" | "geo"> {
  const best = group.reduce((a, b) =>
    PRECISION[b.geo] > PRECISION[a.geo] || (PRECISION[b.geo] === PRECISION[a.geo] && b.severity > a.severity) ? b : a,
  );
  return { lat: best.lat, lon: best.lon, geo: best.geo };
}

function bump(s: Severity, by = 1): Severity {
  return Math.min(4, s + by) as Severity;
}

export function fuse(signals: Signal[], agents: Agent[], chains: ImpactChain[] = []) {
  const now = new Date().toISOString();
  const messages: BusMessage[] = [];
  const alerts: FusedAlert[] = [];
  const byAgent = new Map(agents.map((a) => [a.id, a]));
  const leadOf = (c: CountryCode) => agents.find((a) => a.country === c && a.domain === "fusion")!;

  // 1 ─ Collectors report to their lead (only noteworthy traffic is logged).
  for (const a of agents) {
    if (a.domain === "fusion") continue;
    const mine = signals.filter((s) => s.agentId === a.id);
    if (!mine.length) continue;
    const top = mine.reduce((x, y) => (y.severity > x.severity ? y : x));
    messages.push({
      id: msgId(),
      time: now,
      from: a.callsign,
      to: leadOf(a.country).callsign,
      kind: "report",
      text: `${mine.length} item(s); top ${SEVERITY_LABEL[top.severity]}: ${top.title}`,
      signalIds: mine.map((s) => s.id),
    });
  }

  // 2 ─ Country leads correlate.
  for (const c of COUNTRIES) {
    const lead = leadOf(c.code);
    const local = signals.filter((s) => s.country === c.code && s.severity >= 1);

    // 2a — corroboration: same strong tag across ≥2 domains.
    const byTag = new Map<string, Signal[]>();
    // Mentions of other countries are handled by SEA-HQ's cross-border pass, not as local corroboration.
    for (const s of local) for (const t of s.tags) if (!WEAK_TAGS.has(t) && !t.startsWith("advisory-level") && !t.startsWith("country:") && !CAPITAL_TAGS.has(t)) {
      (byTag.get(t) ?? byTag.set(t, []).get(t)!).push(s);
    }
    const usedSets = new Set<string>();
    for (const [tag, group] of byTag) {
      const domains = [...new Set(group.map((s) => s.domain))];
      if (domains.length < 2) continue;
      const total = group.reduce((n, s) => n + s.severity, 0);
      if (total < 4) continue;
      const key = group.map((s) => s.id).sort().join(",");
      if (usedSets.has(key)) continue;
      usedSets.add(key);
      const max = Math.max(...group.map((s) => s.severity)) as Severity;
      const sev = domains.length >= 3 ? bump(max) : max;
      const label = tag.replace(/^(place|storm|country):/, "");
      const agentIds = [...new Set(group.map((s) => s.agentId))];
      alerts.push({
        id: hash(`${c.code}|tag|${tag}`),
        countries: [c.code],
        domains,
        severity: sev,
        headline: `${c.name}: "${tag.startsWith("country:") ? COUNTRY_BY_CODE[label as CountryCode].name : label}" corroborated by ${domains.length} agent disciplines`,
        rationale: `${domains.map((d) => DOMAIN_LABEL[d]).join(", ")} agents independently reported on "${label}". Top: ${group
          .sort((a, b) => b.severity - a.severity)
          .slice(0, 2)
          .map((s) => s.title)
          .join(" | ")}`,
        signalIds: group.map((s) => s.id),
        agents: agentIds.map((id) => byAgent.get(id)!.callsign),
        time: now,
        ...locate(group),
      });
      for (const id of agentIds) {
        messages.push({
          id: msgId(),
          time: now,
          from: lead.callsign,
          to: byAgent.get(id)!.callsign,
          kind: "corroborate",
          text: `Your "${label}" report is corroborated by ${domains.filter((d) => d !== byAgent.get(id)!.domain).map((d) => DOMAIN_LABEL[d]).join(", ")}. Keep watching.`,
          signalIds: group.map((s) => s.id),
        });
      }
    }

    // 2b — cause → effect chains.
    for (const chain of CHAINS) {
      const causes = local.filter((s) => chain.cause.includes(s.domain) && s.severity >= chain.minCause);
      const effects = local.filter((s) => chain.effect.includes(s.domain) && s.severity >= 1);
      if (!causes.length || !effects.length) continue;
      const linked = effects.filter((e) => causes.some((k) => k.tags.some((t) => !WEAK_TAGS.has(t) && e.tags.includes(t))));
      const hardCause = causes.some((k) => k.severity >= 3);
      if (!linked.length && !hardCause) continue;
      const involved = [...causes.slice(0, 3), ...(linked.length ? linked : effects).slice(0, 3)];
      const sev = Math.max(...causes.map((s) => s.severity)) as Severity;
      const linkedNote = linked.length ? "Linked by shared tags." : "No shared tag yet — lead has tasked effect agents to check exposure.";
      alerts.push({
        id: hash(`${c.code}|chain|${chain.headline("")}`),
        countries: [c.code],
        domains: [...new Set(involved.map((s) => s.domain))],
        severity: linked.length ? sev : (Math.max(1, sev - 1) as Severity),
        headline: chain.headline(c.name),
        rationale: `${chain.why} ${linkedNote} Cause: ${causes[0].title}`,
        signalIds: involved.map((s) => s.id),
        agents: [...new Set(involved.map((s) => byAgent.get(s.agentId)!.callsign))],
        time: now,
        ...locate([...causes, ...linked]),
      });
      for (const d of chain.effect) {
        const target = agents.find((a) => a.country === c.code && a.domain === d);
        if (!target) continue;
        messages.push({
          id: msgId(),
          time: now,
          from: lead.callsign,
          to: target.callsign,
          kind: "escalate",
          text: `Tasking: check ${DOMAIN_LABEL[d].toLowerCase()} exposure to "${causes[0].title.slice(0, 90)}"`,
          signalIds: causes.map((s) => s.id),
        });
      }
    }
  }

  // 3 ─ Regional HQ: cross-border correlation.
  const strongByTag = new Map<string, Signal[]>();
  for (const s of signals) {
    if (s.severity < 2) continue;
    for (const t of s.tags) {
      if (!t.startsWith("country:") && !CROSS_BORDER_TAG(t)) continue;
      // A Thai agent reporting on Cambodia and a Cambodian agent reporting on Thailand
      // describe the same bilateral situation, so both land in one "pair:" bucket.
      const key = t.startsWith("country:") ? `pair:${[s.country, t.slice(8)].sort().join("-")}` : t;
      (strongByTag.get(key) ?? strongByTag.set(key, []).get(key)!).push(s);
    }
  }
  const regionalSets = new Set<string>();
  for (const [tag, group] of [...strongByTag].sort(([a], [b]) => Number(b.startsWith("pair:")) - Number(a.startsWith("pair:")))) {
    let countries = [...new Set(group.map((s) => s.country))];
    let label = tag;
    if (tag.startsWith("pair:")) {
      countries = tag.slice(5).split("-") as CountryCode[];
      label = `${countries.map((c) => COUNTRY_BY_CODE[c].name).join("–")} bilateral tension`;
    }
    if (countries.length < 2) continue;
    // Skip if a broader alert already covers exactly these signals (or a superset).
    const ids = group.map((s) => s.id);
    if ([...regionalSets].some((set) => ids.every((id) => set.includes(id)))) continue;
    regionalSets.add(ids.join(","));
    const max = Math.max(...group.map((s) => s.severity)) as Severity;
    alerts.push({
      id: hash(`region|${tag}`),
      countries,
      domains: [...new Set(group.map((s) => s.domain))],
      severity: countries.length >= 3 ? bump(max) : max,
      headline: tag.startsWith("pair:")
        ? `Cross-border: ${label}`
        : `Cross-border: ${label.replace(/^storm:/, "storm ")} active across ${countries.map((c) => COUNTRY_BY_CODE[c].name).join(", ")}`,
      rationale: `${group.length} medium+ reports share "${label}". ${group
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 2)
        .map((s) => `[${s.country}] ${s.title}`)
        .join(" | ")}`,
      signalIds: group.map((s) => s.id),
      agents: [...new Set(group.map((s) => byAgent.get(s.agentId)!.callsign))],
      time: now,
      ...locate(group),
    });
    for (const c of countries) {
      messages.push({
        id: msgId(),
        time: now,
        from: "SEA-HQ",
        to: leadOf(c).callsign,
        kind: "cross-border",
        text: `"${label}" is live in ${countries.filter((x) => x !== c).map((x) => COUNTRY_BY_CODE[x].name).join(", ") || "a neighbour"}; align your picture.`,
        signalIds: group.map((s) => s.id),
      });
    }
  }

  // 3b ─ Knock-on alerts: cross-border effects that target agents have observed or confirmed.
  const knockSeen = new Set<string>();
  for (const ch of chains) {
    for (const im of ch.impacts) {
      if (im.from === im.to || im.severity < 2 || (im.status !== "observed" && im.status !== "confirmed")) continue;
      // A→B and B→A of the same effect (e.g. haze drifting both ways) is one regional story.
      const pairKey = `${ch.event}|${im.domain}|${[im.from, im.to].sort().join("-")}`;
      if (knockSeen.has(pairKey)) continue;
      knockSeen.add(pairKey);
      alerts.push({
        id: hash(`knock|${im.id}`),
        countries: [im.from, im.to],
        domains: [...new Set([signals.find((s) => s.id === ch.trigger)?.domain ?? "fusion", im.domain])] as Domain[],
        severity: im.severity,
        headline: `Knock-on: ${ch.event.toLowerCase()} in ${COUNTRY_BY_CODE[im.from].name} → ${im.effect}`,
        rationale: `${im.mechanism}. ${im.targetAgent} ${im.status === "confirmed" ? "confirmed it by follow-up collection" : "was already reporting it"}. Trigger: ${ch.headline}`,
        signalIds: [ch.trigger, ...im.evidence],
        agents: [im.sourceAgent, im.targetAgent],
        time: now,
        lat: im.toLat,
        lon: im.toLon,
        geo: "country",
      });
      messages.push({
        id: msgId(),
        time: now,
        from: "SEA-HQ",
        to: leadOf(im.to).callsign,
        kind: "escalate",
        text: `Confirmed spill-over from ${COUNTRY_BY_CODE[im.from].name}: ${im.effect}`,
        signalIds: im.evidence,
      });
    }
  }

  // De-duplicate alerts and rank.
  const unique = [...new Map(alerts.map((a) => [a.id, a])).values()].sort(
    (a, b) => b.severity - a.severity || b.signalIds.length - a.signalIds.length,
  );

  // 4 ─ Country pictures + briefs.
  const countries: CountryPicture[] = COUNTRIES.map((c) => {
    const local = signals.filter((s) => s.country === c.code);
    const domainScore = new Map<Domain, number>();
    for (const s of local) {
      const decay = Math.max(0.25, 1 - Math.max(0, hoursAgo(s.time)) / 96);
      const pts = SEVERITY_POINTS[s.severity] * DOMAIN_WEIGHT[s.domain] * decay;
      domainScore.set(s.domain, (domainScore.get(s.domain) ?? 0) + pts);
    }
    // Diminishing returns per discipline: ten stories about one thing shouldn't max out a
    // country — breadth across disciplines matters more than volume in one.
    let total = 0;
    for (const v of domainScore.values()) total += 30 * (1 - Math.exp(-v / 30));
    // Exposure to knock-on effects from incidents elsewhere also raises a country's risk.
    const inboundImpacts = chains.flatMap((ch) => ch.impacts).filter((im) => im.to === c.code && im.from !== c.code);
    for (const im of inboundImpacts) {
      if (im.status === "no-evidence") continue;
      total += SEVERITY_POINTS[im.severity] * DOMAIN_WEIGHT[im.domain] * im.confidence * (im.status === "projected" ? 0.4 : 0.8);
    }
    const risk = Math.round(100 * (1 - Math.exp(-total / 220)));
    const level: Severity = risk >= 80 ? 4 : risk >= 60 ? 3 : risk >= 35 ? 2 : risk >= 10 ? 1 : 0;
    const advisory = local.find((s) => s.domain === "advisory" && s.source === "US State Dept");
    const advisoryLevel = advisory ? Number(advisory.tags.find((t) => t.startsWith("advisory-level:"))?.split(":")[1]) || undefined : undefined;
    const topDomains = [...domainScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([domain, score]) => ({ domain, score: Math.round(score) }));
    const countryAlerts = unique.filter((a) => a.countries.includes(c.code));
    const brief: string[] = [];
    brief.push(
      `Overall risk ${risk}/100 (${SEVERITY_LABEL[level]}) from ${local.length} signals${advisoryLevel ? `; US advisory Level ${advisoryLevel}` : ""}.`,
    );
    if (topDomains.length) brief.push(`Main drivers: ${topDomains.map((d) => DOMAIN_LABEL[d.domain]).join(", ")}.`);
    for (const a of countryAlerts.slice(0, 3)) brief.push(`[${SEVERITY_LABEL[a.severity]}] ${a.headline}`);
    for (const im of inboundImpacts.filter((x) => x.status !== "no-evidence").sort((a, b) => b.confidence - a.confidence).slice(0, 2)) {
      brief.push(`Inbound from ${COUNTRY_BY_CODE[im.from].name} (${im.status}, ${Math.round(im.confidence * 100)}%): ${im.effect}`);
    }
    const weather = local.find((s) => s.domain === "weather" && s.severity === 0);
    if (weather) brief.push(weather.title);
    const lead = leadOf(c.code);
    const agentsHere = agents.filter((a) => a.country === c.code && a.domain !== "fusion");
    messages.push({
      id: msgId(),
      time: now,
      from: lead.callsign,
      to: "SEA-HQ",
      kind: "brief",
      text: brief.join(" "),
      signalIds: [],
    });
    return {
      country: c.code,
      name: c.name,
      risk,
      level,
      topDomains,
      brief,
      advisoryLevel,
      agentsOk: 0, // filled in by the engine (needs run status)
      agentsTotal: agentsHere.length + 1,
      inbound: inboundImpacts.filter((x) => x.status !== "no-evidence").length,
    };
  });

  const ranked = [...countries].sort((a, b) => b.risk - a.risk);
  const regionalBrief = [
    `Highest risk: ${ranked[0].name} (${ranked[0].risk}/100), lowest: ${ranked[ranked.length - 1].name} (${ranked[ranked.length - 1].risk}/100).`,
    `${unique.filter((a) => a.severity >= 3).length} high/critical fused alerts; ${unique.filter((a) => a.countries.length > 1).length} cross-border.`,
    ...unique.slice(0, 5).map((a) => `[${SEVERITY_LABEL[a.severity]}] ${a.headline}`),
  ];
  const cross = chains.flatMap((ch) => ch.impacts).filter((im) => im.from !== im.to && im.status !== "no-evidence");
  if (cross.length) {
    regionalBrief.push(
      `${cross.length} cross-border knock-on effects tracked (${cross.filter((x) => x.status !== "projected").length} observed/confirmed). Most exposed: ${
        [...countries].sort((a, b) => b.inbound - a.inbound)[0].name
      }.`,
    );
  }

  return { alerts: unique, messages, countries, regionalBrief };
}
