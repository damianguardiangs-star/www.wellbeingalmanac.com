import { COUNTRIES, type CountryConfig } from "./config";
import { PLACES } from "./gazetteer";
import type { Severity } from "./types";

/** Keyword → severity lexicon used to triage headlines. Highest match wins. */
const LEXICON: [RegExp, Severity][] = [
  [/\b(coup|tsunami|martial law|state of emergency|massacre|airstrikes?|war breaks|mass shooting)\b/i, 4],
  [
    /\b(killed|kills|dead|deaths?|death toll|bomb(ing)?s?|attack(ed|s)?|clash(es)?|riots?|shooting|landslides?|floods?|flooding|typhoon|cyclone|outbreak|evacuat\w*|curfew|kidnap\w*|trafficking|crash(es)?|explosion|gunfire|hostage|border clos\w*|missing)\b/i,
    3,
  ],
  [
    /\b(protests?|arrest(s|ed)?|warn(s|ing|ed)?|strikes?|injured|scams?|fraud|bans?|banned|tariffs?|cancel(l)?ed|delay(s|ed)?|suspend(s|ed)?|dengue|fires?|storms?|outages?|blackout|tensions?|sanctions?|collapse\w*|detained|seized|raid(s|ed)?|disrupt\w*|shortage|surge|plunge)\b/i,
    2,
  ],
];

export function scoreHeadline(text: string): Severity {
  let sev: Severity = 1;
  for (const [re, s] of LEXICON) {
    if (re.test(text) && s > sev) sev = s;
  }
  const toll = text.match(/\b(\d{1,4})\s+(people\s+)?(killed|dead|die|died|deaths)\b/i);
  if (toll && Number(toll[1]) >= 10) sev = 4;
  return sev;
}

/** Event vocabulary shared by all agents so their reports can be correlated. */
const EVENT_TERMS = [
  "flood",
  "landslide",
  "typhoon",
  "storm",
  "earthquake",
  "volcano",
  "eruption",
  "haze",
  "heatwave",
  "drought",
  "protest",
  "strike",
  "election",
  "coup",
  "border",
  "port",
  "airport",
  "ferry",
  "flight",
  "scam",
  "trafficking",
  "dengue",
  "outbreak",
  "tariff",
  "sanction",
  "blackout",
  "dam",
  "students",
  "tourists",
  "navy",
  "coast guard",
  "military",
  "rice",
  "palm oil",
  "coal",
  "coffee",
  "rubber",
  "oil price",
];

const STEMS: Record<string, RegExp> = Object.fromEntries(
  EVENT_TERMS.map((t) => [t, new RegExp(`\\b${t.replace(/ /g, "\\s+")}(s|es|ing|ed)?\\b`, "i")]),
);

export function extractTags(text: string, home: CountryConfig): string[] {
  const tags = new Set<string>();
  for (const [term, re] of Object.entries(STEMS)) if (re.test(text)) tags.add(term);

  const lower = text.toLowerCase();
  for (const place of [...home.cities.map((c) => c.name), ...home.maritime, ...home.flashpoints]) {
    if (lower.includes(place.toLowerCase())) tags.add(`place:${place.toLowerCase()}`);
  }
  // Mentions of neighbouring countries enable cross-border correlation.
  for (const other of COUNTRIES) {
    if (other.code === home.code) continue;
    if (other.aliases.some((a) => lower.includes(a.toLowerCase())) || (other.code === "TH" && /\bthai\b/i.test(text))) {
      tags.add(`country:${other.code}`);
    }
  }
  const storm = text.match(/\b(?:[Tt]yphoon|[Tt]ropical [Ss]torm|[Ss]torm|[Cc]yclone|TYPHOON|STORM)\s+([A-Z][a-z]+)/);
  if (storm && !/^(warning|season|surge|hits|batters|kills)$/i.test(storm[1])) tags.add(`storm:${storm[1].toLowerCase()}`);
  if (/south china sea|spratly|paracel|natuna/i.test(text)) tags.add("south china sea");
  if (/mekong/i.test(text)) tags.add("mekong");
  return [...tags];
}

/** Points per severity used for risk scoring (super-linear so criticals dominate). */
export const SEVERITY_POINTS: Record<Severity, number> = { 0: 0, 1: 1, 2: 3, 3: 8, 4: 20 };

export function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[\\s-]+");
const RELEVANCE = new Map<string, [RegExp, RegExp | null]>();

/**
 * Does a headline actually concern this country? Search engines return loose matches
 * (a French protest for a "Laos protest" query), so a story must name the country, a
 * demonym, or one of its known places, ports or flashpoints.
 */
export function isAbout(text: string, c: CountryConfig): boolean {
  let entry = RELEVANCE.get(c.code);
  if (!entry) {
    const terms = [
      ...c.aliases,
      ...c.demonyms,
      ...c.cities.map((x) => x.name),
      ...c.maritime,
      ...c.flashpoints.filter((f) => !/china|united states|asean|border/i.test(f)),
      ...PLACES.filter((p) => p.country === c.code).map((p) => p.name),
    ];
    const long = [...new Set(terms.filter((t) => t.length > 4))];
    // Short names (Bali, Hue, Yala, Lao, Thai…) match case-sensitively to avoid hits on ordinary words.
    const short = [...new Set(terms.filter((t) => t.length <= 4))];
    entry = [
      new RegExp(`\\b(${long.map(escapeRe).join("|")})\\b`, "i"),
      short.length ? new RegExp(`\\b(${short.map(escapeRe).join("|")})\\b`) : null,
    ];
    RELEVANCE.set(c.code, entry);
  }
  return entry[0].test(text) || (entry[1]?.test(text) ?? false);
}
