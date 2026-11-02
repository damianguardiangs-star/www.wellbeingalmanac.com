/**
 * Impact propagation — how agents coordinate on consequences, not just reports.
 *
 *  1. Blackboard: every collector's signals are visible to every other agent.
 *  2. Classify: significant signals are classified into event types (storm, border
 *     conflict, scam crackdown, Mekong/dam, rice shock…). One chain per event per country.
 *  3. Propagate: a dependency model of the region (borders, Mekong flow, port
 *     dependence of landlocked Laos, Lao power exports, rice trade, migrant labour,
 *     scam-compound trafficking routes, South China Sea, typhoon tracks) projects the
 *     knock-on effects onto specific target agents — in the same country and abroad.
 *  4. Verify: each target agent checks the blackboard for evidence. For the most
 *     important unverified cross-border effects the target agent is tasked to run a
 *     targeted follow-up collection. Effects end up observed / confirmed / projected /
 *     no-evidence, and the whole exchange is logged on the bus.
 *  5. Interpret: each chain carries a geopolitical reading of what it means.
 */
import { COUNTRIES, COUNTRY_BY_CODE } from "./config";
import { COUNTRY_CENTROID, geocode } from "./gazetteer";
import { extractTags, hash, hoursAgo, scoreHeadline } from "./analysis";
import { searchNews } from "./sources";
import type { Agent } from "./agents";
import type {
  BusMessage,
  CountryCode,
  Domain,
  Horizon,
  Impact,
  ImpactChain,
  Severity,
  Signal,
} from "./types";

// ───────────────────────────── Regional dependency model ─────────────────────────────

const ALL: CountryCode[] = ["ID", "TH", "LA", "KH", "VN"];

/** Land neighbours (within the five), plus Indonesia–Vietnam as South China Sea maritime neighbours. */
const NEIGHBOURS: Record<CountryCode, CountryCode[]> = {
  TH: ["LA", "KH"],
  LA: ["TH", "KH", "VN"],
  KH: ["TH", "LA", "VN"],
  VN: ["LA", "KH"],
  ID: [],
};
/** Downstream along the Mekong. */
const MEKONG_DOWNSTREAM: Record<CountryCode, CountryCode[]> = {
  LA: ["TH", "KH", "VN"],
  TH: ["KH", "VN"],
  KH: ["VN"],
  VN: [],
  ID: [],
};
/** Countries whose sea trade runs through this country's ports / straits. */
const SEA_OUTLET_USERS: Record<CountryCode, CountryCode[]> = {
  VN: ["LA", "KH"], // Hai Phong / Vung Ang for Laos; Cai Mep transhipment for Cambodia
  TH: ["LA", "KH"], // Laem Chabang is Laos' main gateway
  KH: [],
  LA: [],
  ID: ["TH", "VN", "KH"], // Malacca / Sunda straits
};
/** Typhoons crossing Vietnam typically track inland into these. */
const STORM_PATH: Record<CountryCode, CountryCode[]> = {
  VN: ["LA", "TH", "KH"],
  LA: ["TH"],
  KH: ["TH", "LA"],
  TH: ["LA"],
  ID: [],
};
/** Lao hydropower buyers. */
const POWER_BUYERS: Record<CountryCode, CountryCode[]> = { LA: ["TH", "VN", "KH"], TH: [], KH: [], VN: [], ID: [] };
/** Where this country's migrant workers are (Thailand hosts large Cambodian & Lao workforces). */
const LABOUR_LINKS: Partial<Record<CountryCode, CountryCode[]>> = { TH: ["KH", "LA"], KH: ["TH"], LA: ["TH"] };
const RICE_EXPORTERS: CountryCode[] = ["TH", "VN", "KH"];
const SCAM_HUBS: CountryCode[] = ["KH", "LA"];
const SCS_STATES: CountryCode[] = ["VN", "ID"];

type Scope =
  | "self"
  | "neighbours"
  | "named" // other countries named in the trigger (country:XX tags)
  | "mekong"
  | "outlet-users"
  | "storm-path"
  | "power-buyers"
  | "labour"
  | "rice-partners"
  | "scam-victims"
  | "scs"
  | "others";

function resolve(scope: Scope, from: CountryCode, s: Signal): CountryCode[] {
  const named = s.tags.filter((t) => t.startsWith("country:")).map((t) => t.slice(8) as CountryCode);
  switch (scope) {
    case "self":
      return [from];
    case "neighbours":
      return NEIGHBOURS[from];
    case "named":
      return named.length ? named : NEIGHBOURS[from].slice(0, 1);
    case "mekong":
      return MEKONG_DOWNSTREAM[from];
    case "outlet-users":
      return SEA_OUTLET_USERS[from];
    case "storm-path":
      return STORM_PATH[from];
    case "power-buyers":
      return POWER_BUYERS[from];
    case "labour":
      return LABOUR_LINKS[from] ?? [];
    case "rice-partners":
      // An exporter's shock hits importers (Indonesia) and shifts demand to rival exporters.
      return RICE_EXPORTERS.includes(from) ? ["ID", ...RICE_EXPORTERS.filter((c) => c !== from)] : RICE_EXPORTERS;
    case "scam-victims":
      return SCAM_HUBS.includes(from) ? ALL.filter((c) => !SCAM_HUBS.includes(c)) : SCAM_HUBS;
    case "scs":
      return SCS_STATES.filter((c) => c !== from);
    case "others":
      return ALL.filter((c) => c !== from);
  }
}

// ───────────────────────────── Event classes ─────────────────────────────

type EventType =
  | "storm"
  | "quake"
  | "haze"
  | "border"
  | "unrest"
  | "political"
  | "scs"
  | "rice"
  | "commodity"
  | "fx"
  | "outbreak"
  | "scam"
  | "port"
  | "aviation"
  | "power"
  | "mekong"
  | "trade";

const EVENT_LABEL: Record<EventType, string> = {
  storm: "Storm / flood",
  quake: "Earthquake / volcano",
  haze: "Haze / air pollution",
  border: "Border confrontation",
  unrest: "Civil unrest",
  political: "Political shock",
  scs: "South China Sea tension",
  rice: "Rice market shock",
  commodity: "Commodity shock",
  fx: "Currency move",
  outbreak: "Disease outbreak",
  scam: "Scam compounds / trafficking",
  port: "Port / shipping disruption",
  aviation: "Aviation disruption",
  power: "Power / infrastructure failure",
  mekong: "Mekong / dam",
  trade: "Tariffs / trade measures",
};

function classify(s: Signal): EventType[] {
  if (s.severity < 2) return [];
  const t = new Set(s.tags);
  const text = s.title.toLowerCase();
  const out: EventType[] = [];
  const has = (...k: string[]) => k.some((x) => t.has(x));
  if (has("typhoon", "flood", "landslide") || [...t].some((x) => x.startsWith("storm:")) || (s.domain === "weather" && s.severity >= 3))
    out.push("storm");
  if (s.domain === "seismic" || has("earthquake", "volcano", "eruption")) out.push("quake");
  if (has("haze") || (s.domain === "air" && s.severity >= 2)) out.push("haze");
  if ((has("border") || [...t].some((x) => x.startsWith("country:"))) && ["security", "geopolitics", "unrest", "infrastructure"].includes(s.domain))
    out.push("border");
  if (s.domain === "unrest" || has("protest", "strike")) out.push("unrest");
  if ((s.domain === "politics" && s.severity >= 3) || has("coup", "election")) out.push("political");
  if (has("south china sea") || (has("coast guard", "navy") && s.domain === "maritime")) out.push("scs");
  if (has("rice")) out.push("rice");
  else if (s.domain === "commodities") out.push("commodity");
  if (s.domain === "currency") out.push("fx");
  if (s.domain === "health" || has("dengue", "outbreak")) out.push("outbreak");
  if (s.domain === "cyber" || has("scam", "trafficking")) out.push("scam");
  if (s.domain === "maritime" && !out.includes("scs")) out.push("port");
  if (s.domain === "aviation") out.push("aviation");
  if (has("blackout") || (s.domain === "infrastructure" && /power|electric|outage|blackout|grid/.test(text))) out.push("power");
  if (has("mekong", "dam")) out.push("mekong");
  if (has("tariff", "sanction") || (s.domain === "economy" && /tariff|sanction|ban|quota/.test(text))) out.push("trade");
  return [...new Set(out)];
}

// ───────────────────────────── Impact rules ─────────────────────────────

interface Rule {
  scope: Scope;
  domain: Domain;
  effect: (from: string, to: string) => string;
  mechanism: string;
  horizon: Horizon;
  confidence: number;
  /** Words that count as evidence in the target agent's reporting and drive follow-up searches. */
  keywords: string[];
  minSeverity?: Severity;
}

const byName = (name: string) => COUNTRIES.find((c) => c.name === name);

const R = (
  scope: Scope,
  domain: Domain,
  effect: Rule["effect"],
  mechanism: string,
  horizon: Horizon,
  confidence: number,
  keywords: string[],
  minSeverity?: Severity,
): Rule => ({ scope, domain, effect, mechanism, horizon, confidence, keywords, minSeverity });

const RULES: Record<EventType, Rule[]> = {
  storm: [
    R("self", "maritime", () => "Port closures and coastal shipping delays", "Ports suspend operations in high wind / swell", "days", 0.7, ["port", "shipping", "vessel", "cargo"]),
    R("self", "aviation", () => "Flight cancellations, road and rail cuts", "Airports and transport corridors close in severe weather", "hours", 0.65, ["flight", "airport", "road", "train", "cancel"]),
    R("self", "commodities", (f) => `Crop damage and price pressure on ${byName(f)?.commodities.slice(0, 2).join(" / ") ?? "crops"}`, "Flooding destroys standing crops and disrupts harvest logistics", "weeks", 0.45, ["crop", "rice", "coffee", "price", "harvest"]),
    R("self", "health", () => "Post-flood dengue and waterborne disease risk", "Standing water and displacement raise infection risk", "weeks", 0.4, ["dengue", "disease", "hospital", "outbreak"]),
    R("self", "students", () => "Travellers and students may be stranded or need to relocate", "Transport shutdowns strand visitors; campuses close", "hours", 0.55, ["tourists", "students", "stranded", "evacuat"]),
    R("storm-path", "weather", (f, t) => `Storm remnants likely to bring heavy rain to ${t} after ${f}`, "Typhoons crossing the coast track inland as rain-bearing depressions", "days", 0.5, ["rain", "flood", "storm", "typhoon"]),
    R("outlet-users", "maritime", (f, t) => `${t}'s cargo routed through ${f}'s ports delayed`, "Landlocked / transhipment trade depends on the affected ports", "days", 0.45, ["port", "cargo", "freight", "shipping"]),
    R("mekong", "infrastructure", (f, t) => `Higher Mekong levels downstream in ${t}`, "Heavy rain upstream raises river levels and dam releases downstream", "days", 0.35, ["mekong", "river", "flood", "dam"], 3),
  ],
  quake: [
    R("self", "infrastructure", () => "Building, road and power damage near the epicentre", "Ground shaking damages structures and lifelines", "hours", 0.5, ["damage", "collapse", "power", "road"], 3),
    R("self", "aviation", () => "Airport inspections or ash-related closures", "Runway checks after quakes; volcanic ash grounds aircraft", "hours", 0.4, ["airport", "flight", "ash", "cancel"]),
    R("self", "students", () => "Traveller safety checks for visitors near affected area", "Visitors and students need accounting-for after a significant quake", "hours", 0.45, ["tourists", "students", "evacuat"], 3),
    R("self", "maritime", () => "Tsunami watch: harbour and coastal disruption", "Large shallow offshore quakes can generate tsunamis", "hours", 0.35, ["tsunami", "port", "coast"], 4),
  ],
  haze: [
    R("self", "health", () => "Respiratory illness surge; school closures possible", "Fine particulates drive hospital admissions", "days", 0.6, ["respiratory", "hospital", "school", "pm2.5", "haze"]),
    R("self", "aviation", () => "Visibility delays at regional airports", "Smoke reduces visibility below landing minima", "days", 0.3, ["visibility", "flight", "delay"]),
    R("neighbours", "air", (f, t) => `Transboundary smoke drifting from ${f} into ${t}`, "Prevailing winds carry agricultural / forest fire smoke across borders", "days", 0.45, ["haze", "smoke", "air quality", "pm2.5"]),
  ],
  border: [
    R("named", "security", (f, t) => `${t} likely to mirror military posture on the ${f} border; retaliation risk`, "Armed incidents prompt reciprocal deployments", "hours", 0.7, ["troops", "military", "border", "clash", "army"]),
    R("named", "infrastructure", (f, t) => `Crossings between ${f} and ${t} may close; trade and travel halted`, "Governments shut checkpoints during confrontations", "days", 0.6, ["border", "checkpoint", "crossing", "closed"]),
    R("self", "economy", () => "Cross-border trade and border-province economy hit", "Closed crossings cut informal and formal trade", "weeks", 0.45, ["trade", "export", "economy", "border"]),
    R("named", "advisory", (f, t) => `Travel advice for ${t}'s border provinces likely to tighten`, "Foreign ministries update advisories after armed incidents", "days", 0.5, ["advisory", "travel", "warning"]),
    R("labour", "unrest", (f, t) => `${t}'s migrant workers in / from ${f} face backlash or mass return`, "Nationalist tension targets migrant communities; workers return home", "days", 0.45, ["migrant", "workers", "return"]),
    R("named", "geopolitics", (f, t) => `Diplomatic protest from ${t}; ASEAN mediation calls`, "Bilateral incidents escalate to diplomatic and regional forums", "days", 0.6, ["ASEAN", "ministry", "protest", "talks", "ceasefire"]),
  ],
  unrest: [
    R("self", "students", () => "Students and travellers should avoid protest areas; campus disruption", "Rallies concentrate near universities and government districts", "hours", 0.6, ["students", "university", "tourists", "avoid"]),
    R("self", "aviation", () => "Road closures and disrupted airport access", "Protest blockades target transport arteries", "hours", 0.3, ["road", "airport", "blocked", "closure"]),
    R("self", "currency", (f) => `Investor jitters weigh on the ${byName(f)?.currency ?? "currency"}`, "Political risk prompts portfolio outflows", "days", 0.35, ["baht", "rupiah", "dong", "currency", "stocks"], 3),
    R("self", "politics", () => "Government response — crackdown or concessions", "Authorities respond with force, emergency powers or negotiation", "days", 0.5, ["government", "police", "emergency", "talks"]),
    R("labour", "students", (f, t) => `${t} nationals in ${f} advised to keep a low profile`, "Embassies issue advisories to their citizens during unrest", "days", 0.3, ["embassy", "nationals", "citizens"], 3),
  ],
  political: [
    R("self", "currency", () => "Currency and equity volatility", "Political shocks reprice country risk", "days", 0.5, ["currency", "stocks", "investors"]),
    R("self", "unrest", () => "Street mobilisation risk", "Contested decisions bring supporters/opponents onto the streets", "days", 0.45, ["protest", "rally", "supporters"]),
    R("self", "advisory", () => "Foreign governments may update travel advice", "Advisories follow sudden political change", "days", 0.35, ["advisory", "travel"]),
    R("neighbours", "geopolitics", (f, t) => `${t} reassesses ties and border/trade policy towards ${f}`, "Neighbours hedge during leadership uncertainty", "weeks", 0.3, ["relations", "talks", "visit"]),
  ],
  scs: [
    R("self", "maritime", () => "Harassment of fishing / survey vessels; higher marine insurance", "Coast-guard confrontations disrupt fishing and energy surveys", "days", 0.5, ["fishing", "vessel", "coast guard", "survey"]),
    R("scs", "geopolitics", (f, t) => `${t} watches precedent closely; possible claimant solidarity statement`, "Fellow claimants read incidents as precedent for their own EEZ", "days", 0.45, ["South China Sea", "Natuna", "China", "EEZ", "coast guard"]),
    R("others", "maritime", () => "Elevated risk perception on regional shipping lanes", "Most regional trade transits the South China Sea", "weeks", 0.25, ["shipping", "South China Sea", "freight"], 3),
  ],
  rice: [
    R("rice-partners", "commodities", (f, t) => (t === "Indonesia" ? `Higher rice import costs for ${t}` : `Export demand shifts from ${f} to ${t}`), "Regional rice trade is concentrated in a few exporters", "weeks", 0.45, ["rice", "price", "export", "import"]),
    R("self", "economy", () => "Farm incomes and food inflation affected", "Rice is a large share of household spending and rural income", "weeks", 0.35, ["inflation", "farmers", "food prices"]),
  ],
  commodity: [
    R("self", "currency", () => "Export earnings shift moves the currency", "Commodity exporters' currencies track terms of trade", "weeks", 0.3, ["currency", "export earnings"]),
    R("others", "economy", (f, t) => `Input costs in ${t} move with ${f}'s commodity supply`, "Regional manufacturers and utilities import these commodities", "weeks", 0.25, ["prices", "import", "costs"], 3),
  ],
  fx: [
    R("self", "economy", () => "Import costs / inflation pass-through", "Currency moves feed into import prices", "weeks", 0.4, ["inflation", "imports", "central bank"]),
    R("neighbours", "currency", (f, t) => `Regional FX contagion risk for ${t}`, "Investors trade ASEAN currencies as a bloc", "days", 0.3, ["currency", "baht", "dong", "kip", "riel"]),
  ],
  outbreak: [
    R("self", "students", () => "Health precautions for students and travellers", "Visitors lack immunity / local knowledge", "days", 0.5, ["tourists", "students", "travellers", "vaccin"]),
    R("neighbours", "health", (f, t) => `Cross-border spread risk from ${f} into ${t}`, "Porous borders and travel spread vector-borne and infectious disease", "weeks", 0.4, ["dengue", "outbreak", "cases", "disease"]),
    R("self", "aviation", () => "Health screening at airports possible", "Authorities screen arrivals during outbreaks", "days", 0.2, ["screening", "airport"], 3),
  ],
  scam: [
    R("scam-victims", "students", (f, t) => `Young ${t} nationals targeted by fake-job recruitment into ${f} compounds`, "Scam compounds traffic workers via social-media job ads", "days", 0.5, ["job", "trafficking", "scam", "rescued", "lured"]),
    R("scam-victims", "geopolitics", (f, t) => `${t} presses ${f} on repatriation and crackdowns`, "Victim states lobby host governments diplomatically", "weeks", 0.45, ["repatriat", "rescued", "embassy", "crackdown"]),
    R("neighbours", "cyber", (f, t) => `Displaced scam operations may relocate from ${f} to ${t}`, "Crackdowns push operators across nearby borders", "weeks", 0.35, ["scam", "compound", "online fraud"]),
  ],
  port: [
    R("outlet-users", "maritime", (f, t) => `${t}'s imports/exports via ${f} delayed`, "Shared gateway ports", "days", 0.5, ["port", "cargo", "freight", "container"]),
    R("self", "commodities", () => "Export shipments delayed; spot prices react", "Bottlenecks hold commodity cargoes", "days", 0.35, ["export", "shipment", "price"]),
  ],
  aviation: [
    R("self", "students", () => "Travellers and students face missed connections", "Flight disruption strands travellers", "hours", 0.5, ["tourists", "passengers", "stranded"]),
    R("neighbours", "aviation", (f, t) => `Knock-on delays on ${f}–${t} routes`, "Regional hubs share aircraft rotations", "hours", 0.25, ["flights", "delay", "airline"]),
  ],
  power: [
    R("self", "economy", () => "Factory output and services disrupted", "Outages halt manufacturing and data services", "days", 0.4, ["factory", "production", "outage"]),
    R("power-buyers", "infrastructure", (f, t) => `Reduced electricity imports from ${f} into ${t}`, "Lao hydropower is exported to neighbouring grids", "days", 0.45, ["electricity", "power", "imports", "grid"]),
  ],
  mekong: [
    R("mekong", "commodities", (f, t) => `Fisheries and rice in ${t} affected by flow changes from ${f}`, "Dams and floods upstream alter downstream sediment and water", "weeks", 0.4, ["Mekong", "fish", "rice", "water level"]),
    R("mekong", "geopolitics", (f, t) => `Mekong water diplomacy: ${t} raises concerns with ${f}`, "Downstream states contest upstream dam operations (Mekong River Commission)", "weeks", 0.35, ["Mekong", "dam", "river commission"]),
  ],
  trade: [
    R("self", "commodities", () => "Export volumes and prices affected", "Tariffs reprice exports", "weeks", 0.4, ["export", "tariff", "price"]),
    R("self", "currency", () => "Currency pressure from trade outlook", "Trade shocks move FX", "days", 0.35, ["currency", "trade"]),
    R("others", "economy", (f, t) => `Trade diversion: ${t} may gain or lose orders relative to ${f}`, "Supply chains relocate within ASEAN when tariffs change", "weeks", 0.3, ["tariff", "investment", "relocat", "orders"]),
  ],
};

// ───────────────────────────── Geopolitical interpretation ─────────────────────────────

function interpret(ev: EventType, from: CountryCode, s: Signal): string {
  const F = COUNTRY_BY_CODE[from].name;
  const named = s.tags.filter((t) => t.startsWith("country:")).map((t) => COUNTRY_BY_CODE[t.slice(8) as CountryCode].name);
  const other = named[0] ?? "its neighbour";
  switch (ev) {
    case "border":
      return `Armed or political friction on the ${F}–${other} border tends to fuel nationalist mobilisation on both sides, checkpoint closures and pressure on migrant workers. Expect ASEAN calls for restraint, and China and the US to position themselves as potential mediators. Escalation risk is highest in the first 72 hours; watch for ambassador recalls, trade bans and advisory changes.`;
    case "scs":
      return `South China Sea incidents involving ${F} are read across the region as precedent. Vietnam and Indonesia (Natuna) watch each other's handling of Chinese coast-guard pressure. Expect statements, not material escalation, but fishing, energy-survey and insurance costs rise in the short term.`;
    case "scam":
      return `Scam-compound activity in ${F} is now a diplomatic issue: victim states (Indonesia, Vietnam, Thailand and others) press for rescues and repatriation, while crackdowns tend to displace operations across the nearest porous border rather than end them. Watch for Chinese and US pressure, sanctions on operators, and new job-scam warnings for young travellers.`;
    case "mekong":
      return `Mekong developments in ${F} carry downstream consequences for fisheries, rice and flood risk. Downstream states use the Mekong River Commission and bilateral channels to press upstream operators, and Chinese-built dams are often in the frame.`;
    case "storm":
      return `A major weather event in ${F} tests government disaster response, which can become politically sensitive if it is slow. It also creates regional spillover through storm tracks, shared river basins and port dependence (landlocked Laos relies on Thai and Vietnamese ports). Aid offers from China, Japan, the US and ASEAN often carry soft-power signalling.`;
    case "quake":
      return `A significant quake or eruption in ${F} mainly has domestic effects, but it affects aviation, tourism and, if offshore and large, the region's tsunami watch. International aid offers are an arena for influence competition.`;
    case "haze":
      return `Transboundary haze is a recurring irritant in ASEAN relations (2002 ASEAN Agreement on Transboundary Haze Pollution). Expect neighbours to raise it diplomatically if it persists, and agribusiness and land-clearing practices in ${F} to come under scrutiny.`;
    case "unrest":
      return `Unrest in ${F} raises questions about government stability and the security forces' response. Neighbours and investors watch for emergency decrees or military involvement, and embassies issue advice to their nationals.`;
    case "political":
      return `A political shock in ${F} can reorder foreign-policy alignment (balancing between China and the US), stall big infrastructure deals and change border and trade policy towards its neighbours.`;
    case "rice":
    case "commodity":
      return `Commodity moves in ${F} spread through regional supply chains. Export bans or price spikes in major rice exporters hit importers like Indonesia hardest and can prompt food-security diplomacy and stockpiling.`;
    case "fx":
      return `Currency moves in ${F} are watched as a gauge of regional risk appetite. Sharp moves invite central-bank intervention and can ripple to other ASEAN currencies.`;
    case "outbreak":
      return `Outbreaks in ${F} test cross-border health cooperation. Tourism-dependent neighbours weigh screening against economic cost.`;
    case "port":
    case "aviation":
      return `Transport disruption in ${F} matters beyond its borders because regional supply chains, including landlocked Laos, depend on a few gateway ports and hubs.`;
    case "power":
      return `Power disruption involving ${F} highlights grid interdependence (Lao hydropower exports to Thailand, Vietnam and Cambodia) and the politics of the Chinese-financed infrastructure behind much of it.`;
    case "trade":
      return `Trade measures affecting ${F} trigger supply-chain repositioning within ASEAN; the "China+1" relocation flows can shift between Vietnam, Thailand, Indonesia and Cambodia.`;
  }
}

// ───────────────────────────── Engine ─────────────────────────────

const MAX_CHAINS = 30;
const MAX_FOLLOWUPS = 16;
const WEAK = new Set(["military", "students", "tourists", "flight", "port", "storm"]);

let seq = 0;
const mid = () => `i${Date.now().toString(36)}${(seq++).toString(36)}`;

/** The most specific search term for an event: a named storm beats a place beats a generic event word. */
function keyTerm(group: Signal[]): string {
  const tags = group.flatMap((s) => s.tags);
  const storm = tags.find((t) => t.startsWith("storm:"));
  if (storm) return storm.slice(6);
  const strong = tags.find((t) => !WEAK.has(t) && !t.includes(":"));
  const place = tags.find((t) => t.startsWith("place:"));
  return strong ?? place?.slice(6) ?? group[0].title.split(" ").slice(0, 3).join(" ");
}

export async function propagate(
  signals: Signal[],
  agents: Agent[],
  options: { followUps: boolean },
): Promise<{ chains: ImpactChain[]; messages: BusMessage[]; followUpSignals: Signal[] }> {
  const now = new Date().toISOString();
  const messages: BusMessage[] = [];
  const followUpSignals: Signal[] = [];
  const agentFor = (c: CountryCode, d: Domain) => agents.find((a) => a.country === c && a.domain === d)!;
  const byId = new Map(agents.map((a) => [a.id, a]));

  // 2 ─ Classify triggers; one chain per (country, event type), represented by the strongest signal.
  const groups = new Map<string, { ev: EventType; from: CountryCode; signals: Signal[] }>();
  for (const s of signals) {
    for (const ev of classify(s)) {
      // Both sides of a border confrontation report the same bilateral event: one chain, not two.
      const other = s.tags.find((t) => t.startsWith("country:"))?.slice(8);
      const key = ev === "border" && other ? `border|${[s.country, other].sort().join("-")}` : `${s.country}|${ev}`;
      const g = groups.get(key) ?? groups.set(key, { ev, from: s.country, signals: [] }).get(key)!;
      g.signals.push(s);
    }
  }
  for (const g of groups.values()) {
    g.signals.sort((a, b) => b.severity - a.severity);
    g.from = g.signals[0].country; // the chain originates where the strongest report is
  }
  const ranked = [...groups.values()]
    .map((g) => ({ ...g, signals: g.signals.sort((a, b) => b.severity - a.severity) }))
    .sort((a, b) => b.signals[0].severity - a.signals[0].severity || b.signals.length - a.signals.length)
    .slice(0, MAX_CHAINS);

  const chains: ImpactChain[] = [];
  const pendingFollowUps: { impact: Impact; rule: Rule; trigger: Signal; term: string }[] = [];

  for (const g of ranked) {
    const trigger = g.signals[0];
    const src = byId.get(trigger.agentId)!;
    const term = keyTerm(g.signals);
    const impacts: Impact[] = [];

    for (const rule of RULES[g.ev]) {
      if (rule.minSeverity && trigger.severity < rule.minSeverity) continue;
      for (const to of resolve(rule.scope, g.from, trigger)) {
        if (!COUNTRY_BY_CODE[to]) continue;
        const target = agentFor(to, rule.domain);
        if (!target || target.id === src.id) continue;
        const crossBorder = to !== g.from;
        const conf = Math.min(0.95, rule.confidence * (0.75 + 0.1 * trigger.severity));
        const sev = Math.max(1, trigger.severity - (crossBorder ? 1 : 0)) as Severity;

        // 4 ─ Blackboard check: is the target agent already seeing it?
        const kw = rule.keywords.map((k) => k.toLowerCase());
        const triggerTags = trigger.tags.filter((t) => !WEAK.has(t) && !t.startsWith("advisory-level"));
        // Evidence must tie back to *this* event: a shared specific tag, a mention of the source
        // country (cross-border), or — same country only — a domain keyword in a medium+ report.
        const evidence = signals.filter((x) => {
          if (x.agentId !== target.id || x.id === trigger.id || x.severity < 1) return false;
          const title = x.title.toLowerCase();
          if (x.tags.some((t) => triggerTags.includes(t) && !t.startsWith("country:"))) return true;
          if (crossBorder) return x.tags.includes(`country:${g.from}`) || title.includes(term.toLowerCase());
          return x.severity >= 2 && kw.some((k) => title.includes(k));
        });

        const [lat, lon] = evidence[0] && evidence[0].geo !== "country" ? [evidence[0].lat, evidence[0].lon] : COUNTRY_CENTROID[to];
        const impact: Impact = {
          id: hash(`${g.from}|${g.ev}|${to}|${rule.domain}|${rule.mechanism}`),
          from: g.from,
          to,
          sourceAgent: src.callsign,
          targetAgent: target.callsign,
          domain: rule.domain,
          effect: rule.effect(COUNTRY_BY_CODE[g.from].name, COUNTRY_BY_CODE[to].name),
          mechanism: rule.mechanism,
          horizon: rule.horizon,
          confidence: evidence.length ? Math.max(conf, 0.85) : conf,
          severity: evidence.length ? (Math.max(sev, ...evidence.map((e) => e.severity)) as Severity) : sev,
          status: evidence.length ? "observed" : "projected",
          evidence: evidence.map((e) => e.id),
          toLat: lat,
          toLon: lon,
        };
        impacts.push(impact);

        messages.push({
          id: mid(),
          time: now,
          from: src.callsign,
          to: target.callsign,
          kind: "heads-up",
          text: `${EVENT_LABEL[g.ev]} in ${COUNTRY_BY_CODE[g.from].name} ("${trigger.title.slice(0, 70)}") → expect: ${impact.effect} [${rule.horizon}, ${Math.round(impact.confidence * 100)}%]`,
          signalIds: [trigger.id],
        });
        if (evidence.length) {
          messages.push({
            id: mid(),
            time: now,
            from: target.callsign,
            to: src.callsign,
            kind: "confirm",
            text: `Already seeing it: ${evidence[0].title.slice(0, 100)}`,
            signalIds: evidence.map((e) => e.id),
          });
        } else if (crossBorder && impact.confidence >= 0.4 && sev >= 2) {
          pendingFollowUps.push({ impact, rule, trigger, term });
        }
      }
    }

    if (!impacts.length) continue;
    chains.push({
      id: hash(`${g.from}|${g.ev}`),
      event: EVENT_LABEL[g.ev],
      from: g.from,
      trigger: trigger.id,
      supporting: g.signals.slice(1, 8).map((s) => s.id),
      headline: trigger.title,
      severity: trigger.severity,
      lat: trigger.lat,
      lon: trigger.lon,
      interpretation: interpret(g.ev, g.from, trigger),
      impacts: impacts.sort((a, b) => b.confidence - a.confidence),
    });
  }

  // 4b ─ Coordinated follow-up collection by the target agents.
  if (options.followUps && pendingFollowUps.length) {
    const queue = pendingFollowUps
      .sort((a, b) => b.impact.severity - a.impact.severity || b.impact.confidence - a.impact.confidence)
      .slice(0, MAX_FOLLOWUPS);
    await Promise.all(
      queue.map(async ({ impact, rule, term }) => {
        const target = agents.find((a) => a.callsign === impact.targetAgent)!;
        const c = COUNTRY_BY_CODE[impact.to];
        const kws = rule.keywords.slice(0, 4).map((k) => (k.includes(" ") ? `"${k}"` : k));
        const query = `${c.name} (${term.includes(" ") ? `"${term}"` : term} OR ${COUNTRY_BY_CODE[impact.from].name}) (${kws.join(" OR ")})`;
        try {
          const { items, provider } = await searchNews(query);
          const hits = items
            .filter((it) => hoursAgo(it.published) <= 72)
            .filter((it) => {
              const t = it.title.toLowerCase();
              return rule.keywords.some((k) => t.includes(k.toLowerCase())) || t.includes(term.toLowerCase());
            })
            .slice(0, 2);
          for (const it of hits) {
            const fix = geocode(it.title, impact.to);
            if (fix.geo === "place" && impact.evidence.length === 0) {
              impact.toLat = fix.lat;
              impact.toLon = fix.lon;
            }
            const sig: Signal = {
              id: hash(`${target.id}|fu|${it.link}`),
              agentId: target.id,
              country: impact.to,
              domain: impact.domain,
              severity: scoreHeadline(it.title),
              title: it.title,
              url: it.link,
              source: `${it.source} via ${provider} (follow-up)`,
              time: it.published,
              tags: [...extractTags(it.title, c), "follow-up"],
              ...fix,
            };
            followUpSignals.push(sig);
            impact.evidence.push(sig.id);
          }
          if (hits.length) {
            impact.status = "confirmed";
            impact.confidence = Math.max(impact.confidence, 0.75);
            messages.push({
              id: mid(),
              time: now,
              from: impact.targetAgent,
              to: impact.sourceAgent,
              kind: "confirm",
              text: `Follow-up confirms knock-on in ${c.name}: ${hits[0].title.slice(0, 100)}`,
              signalIds: impact.evidence,
            });
          } else {
            impact.status = "no-evidence";
            impact.confidence = Math.round(impact.confidence * 0.7 * 100) / 100;
            messages.push({
              id: mid(),
              time: now,
              from: impact.targetAgent,
              to: impact.sourceAgent,
              kind: "no-evidence",
              text: `Searched for "${impact.effect.slice(0, 70)}" — nothing yet in ${c.name}. Holding as projected.`,
              signalIds: [],
            });
          }
        } catch (e) {
          messages.push({
            id: mid(),
            time: now,
            from: impact.targetAgent,
            to: impact.sourceAgent,
            kind: "no-evidence",
            text: `Follow-up collection failed (${e instanceof Error ? e.message : "error"}); impact remains projected.`,
            signalIds: [],
          });
        }
      }),
    );
  }

  return { chains, messages, followUpSignals };
}

