import { COUNTRIES, ROLES, type CountryConfig, type RoleConfig } from "./config";
import { extractTags, hash, hoursAgo, scoreHeadline } from "./analysis";
import { geocode } from "./gazetteer";
import {
  airQuality,
  fxRates,
  gdacsEvents,
  searchNews,
  ukAdvisory,
  usAdvisories,
  usgsQuakes,
  weatherForecast,
  type SharedCache,
} from "./sources";
import type { CountryCode, Domain, Severity, Signal } from "./types";

export interface AgentContext {
  cache: SharedCache;
  /** FX rates seen on the previous sweep, so the FX agents can measure moves. */
  previousFx?: Record<string, number>;
}

export interface Agent {
  id: string;
  callsign: string;
  country: CountryCode;
  domain: Domain;
  role: string;
  sources: string[];
  run: (ctx: AgentContext) => Promise<Signal[]>;
}

const MAX_NEWS_PER_AGENT = 8;
const NEWS_MAX_AGE_H = 72;

function makeSignal(
  agent: Pick<Agent, "id" | "country" | "domain">,
  c: CountryConfig,
  s: Omit<Signal, "id" | "agentId" | "country" | "domain" | "tags" | "lat" | "lon" | "geo"> &
    Partial<Pick<Signal, "lat" | "lon" | "geo">> & { tags?: string[] },
): Signal {
  const text = `${s.title} ${s.summary ?? ""}`;
  const tags = [...new Set([...(s.tags ?? []), ...extractTags(text, c)])];
  const fix = s.lat != null && s.lon != null ? { lat: s.lat, lon: s.lon, geo: s.geo ?? "exact", place: s.place } : geocode(text, c.code);
  return {
    ...s,
    ...fix,
    id: hash(`${agent.id}|${s.url ?? ""}|${s.title}`),
    agentId: agent.id,
    country: agent.country,
    domain: agent.domain,
    tags,
  };
}

// ───────────────────────────── Collectors ─────────────────────────────

type Runner = (self: Agent, c: CountryConfig, ctx: AgentContext) => Promise<Signal[]>;

const newsRunner =
  (role: RoleConfig): Runner =>
  async (self, c) => {
    const { items, provider } = await searchNews(role.query!(c));
    const seen = new Set<string>();
    const out: Signal[] = [];
    for (const it of items) {
      if (hoursAgo(it.published) > NEWS_MAX_AGE_H) continue;
      const key = it.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(
        makeSignal(self, c, {
          severity: scoreHeadline(it.title),
          title: it.title,
          url: it.link,
          source: `${it.source} via ${provider}`,
          time: it.published,
        }),
      );
      if (out.length >= MAX_NEWS_PER_AGENT) break;
    }
    return out;
  };

const weatherRunner: Runner = async (self, c) => {
  const days = await weatherForecast(c.cities);
  const out: Signal[] = [];
  let wettest = { city: "", mm: 0 };
  let hottest = { city: "", t: -99 };
  days.forEach((d, i) => {
    const city = c.cities[i].name;
    d.date.forEach((date, j) => {
      const rain = d.precipitation_sum[j] ?? 0;
      const heat = d.apparent_temperature_max[j] ?? 0;
      const gust = d.wind_gusts_10m_max[j] ?? 0;
      const code = d.weather_code[j] ?? 0;
      if (rain > wettest.mm) wettest = { city, mm: rain };
      if (heat > hottest.t) hottest = { city, t: heat };
      const issues: [Severity, string][] = [];
      if (rain >= 100) issues.push([4, `extreme rainfall ${rain.toFixed(0)} mm — flood risk`]);
      else if (rain >= 50) issues.push([3, `heavy rain ${rain.toFixed(0)} mm — flood risk`]);
      else if (rain >= 25) issues.push([2, `moderate-heavy rain ${rain.toFixed(0)} mm`]);
      if (heat >= 42) issues.push([3, `dangerous heat, feels like ${heat.toFixed(0)}°C`]);
      else if (heat >= 39) issues.push([2, `high heat, feels like ${heat.toFixed(0)}°C`]);
      if (gust >= 90) issues.push([4, `storm-force gusts ${gust.toFixed(0)} km/h`]);
      else if (gust >= 62) issues.push([3, `gale-force gusts ${gust.toFixed(0)} km/h`]);
      if (code >= 95) issues.push([2, "thunderstorms forecast"]);
      if (!issues.length) return;
      const sev = Math.max(...issues.map((x) => x[0])) as Severity;
      out.push(
        makeSignal(self, c, {
          severity: sev,
          title: `${city} ${date}: ${issues.map((x) => x[1]).join("; ")}`,
          source: "Open-Meteo forecast",
          url: `https://open-meteo.com/en/docs#latitude=${c.cities[i].lat}&longitude=${c.cities[i].lon}`,
          lat: c.cities[i].lat,
          lon: c.cities[i].lon,
          place: city,
          time: new Date().toISOString(),
          tags: [
            `place:${city.toLowerCase()}`,
            ...(rain >= 50 ? ["flood"] : []),
            ...(gust >= 62 ? ["storm"] : []),
            ...(heat >= 39 ? ["heatwave"] : []),
          ],
        }),
      );
    });
  });
  out.push(
    makeSignal(self, c, {
      severity: 0,
      title: `72h outlook: wettest ${wettest.city || "—"} (${wettest.mm.toFixed(0)} mm/day), hottest ${hottest.city} (feels ${hottest.t.toFixed(0)}°C)`,
      source: "Open-Meteo forecast",
      time: new Date().toISOString(),
    }),
  );
  return out;
};

const airRunner: Runner = async (self, c) => {
  const now = await airQuality(c.cities);
  return now.map((a, i) => {
    const aqi = a.us_aqi ?? 0;
    const sev: Severity = aqi > 300 ? 4 : aqi > 200 ? 3 : aqi > 150 ? 2 : aqi > 100 ? 1 : 0;
    const band =
      aqi > 300 ? "hazardous" : aqi > 200 ? "very unhealthy" : aqi > 150 ? "unhealthy" : aqi > 100 ? "unhealthy for sensitive groups" : aqi > 50 ? "moderate" : "good";
    return makeSignal(self, c, {
      severity: sev,
      title: `${c.cities[i].name} air quality ${band} — US AQI ${aqi}, PM2.5 ${a.pm2_5 ?? "?"} µg/m³`,
      source: "Open-Meteo air quality (CAMS)",
      time: new Date().toISOString(),
      lat: c.cities[i].lat,
      lon: c.cities[i].lon,
      place: c.cities[i].name,
      tags: [`place:${c.cities[i].name.toLowerCase()}`, ...(aqi > 150 ? ["haze"] : [])],
    });
  });
};

const seismicRunner: Runner = async (self, c, ctx) => {
  const [minLon, minLat, maxLon, maxLat] = c.bbox;
  const quakes = await usgsQuakes(ctx.cache);
  return quakes
    .filter((q) => q.mag >= 4 && q.lon >= minLon - 1 && q.lon <= maxLon + 1 && q.lat >= minLat - 1 && q.lat <= maxLat + 1)
    .slice(0, 10)
    .map((q) => {
      let sev: Severity = q.mag >= 7 ? 4 : q.mag >= 6 ? 3 : q.mag >= 5 ? 2 : 1;
      if (q.tsunami && sev < 4) sev = (sev + 1) as Severity;
      return makeSignal(self, c, {
        severity: sev,
        title: `M${q.mag.toFixed(1)} earthquake — ${q.place}${q.tsunami ? " (tsunami flag)" : ""}`,
        url: q.url,
        source: "USGS",
        time: q.time,
        lat: q.lat,
        lon: q.lon,
        tags: ["earthquake"],
      });
    });
};

const disasterRunner: Runner = async (self, c, ctx) => {
  const events = await gdacsEvents(ctx.cache);
  return events
    .filter((e) => c.aliases.some((a) => e.countries.toLowerCase().includes(a.toLowerCase())))
    .map((e) => {
      const sev: Severity = e.alert === "Red" ? 4 : e.alert === "Orange" ? 3 : 1;
      return makeSignal(self, c, {
        severity: sev,
        title: `${e.alert} alert: ${e.type} — ${e.name}`,
        summary: e.description,
        url: e.url,
        source: "GDACS (UN/EC)",
        time: new Date(e.from).toISOString(),
        ...(e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : {}),
        tags: [e.type.toLowerCase().replace("tropical cyclone", "typhoon")],
      });
    });
};

const fxRunner: Runner = async (self, c, ctx) => {
  const fx = await fxRates(ctx.cache);
  const rate = fx.rates[c.currency];
  if (!rate) return [];
  const prev = ctx.previousFx?.[c.currency];
  const pct = prev ? ((rate - prev) / prev) * 100 : 0;
  const abs = Math.abs(pct);
  const sev: Severity = abs >= 2 ? 3 : abs >= 1 ? 2 : abs >= 0.5 ? 1 : 0;
  const move = prev ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% since last sweep; ${pct > 0 ? c.currency + " weakening" : pct < 0 ? c.currency + " strengthening" : "flat"})` : "";
  return [
    makeSignal(self, c, {
      severity: sev,
      title: `USD/${c.currency} ${rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}${move}`,
      source: "open.er-api.com",
      url: "https://www.exchangerate-api.com/",
      time: fx.updated,
    }),
  ];
};

const UK_SLUG: Record<CountryCode, string> = {
  ID: "indonesia",
  TH: "thailand",
  LA: "laos",
  KH: "cambodia",
  VN: "vietnam",
};

const advisoryRunner: Runner = async (self, c, ctx) => {
  const out: Signal[] = [];
  const errors: string[] = [];
  const [us, uk] = await Promise.allSettled([usAdvisories(ctx.cache), ukAdvisory(UK_SLUG[c.code])]);
  if (us.status === "fulfilled") {
    const a = us.value.find((x) => c.aliases.some((al) => x.title.toLowerCase().startsWith(al.toLowerCase())));
    if (a) {
      const sev: Severity = a.level === 4 ? 4 : a.level === 3 ? 3 : a.level === 2 ? 1 : 0;
      out.push(
        makeSignal(self, c, {
          severity: sev,
          title: `${a.issuer}: ${a.title}`,
          summary: a.summary,
          url: a.url,
          source: a.issuer,
          time: a.updated,
          tags: [`advisory-level:${a.level ?? "?"}`],
        }),
      );
    }
  } else errors.push(String(us.reason?.message ?? us.reason));
  if (uk.status === "fulfilled") {
    const a = uk.value;
    out.push(
      makeSignal(self, c, {
        severity: hoursAgo(a.updated) < 72 ? 1 : 0,
        title: `${a.issuer} updated ${a.title}${a.summary ? `: ${a.summary}` : ""}`,
        url: a.url,
        source: a.issuer,
        time: a.updated,
      }),
    );
  } else errors.push(String(uk.reason?.message ?? uk.reason));
  if (!out.length && errors.length) throw new Error(errors.join("; "));
  return out;
};

const STRUCTURED: Partial<Record<Domain, { run: Runner; sources: string[] }>> = {
  weather: { run: weatherRunner, sources: ["Open-Meteo"] },
  air: { run: airRunner, sources: ["Open-Meteo / CAMS"] },
  seismic: { run: seismicRunner, sources: ["USGS"] },
  disaster: { run: disasterRunner, sources: ["GDACS"] },
  currency: { run: fxRunner, sources: ["open.er-api.com"] },
  advisory: { run: advisoryRunner, sources: ["US State Dept", "UK FCDO"] },
  fusion: { run: async () => [], sources: ["Agent bus"] },
};

// ───────────────────────────── Roster ─────────────────────────────

/** 5 countries × 20 roles = 100 agents. */
export const AGENTS: Agent[] = COUNTRIES.flatMap((c) =>
  ROLES.map((role, i) => {
    const structured = STRUCTURED[role.domain];
    const runner = structured?.run ?? newsRunner(role);
    const agent: Agent = {
      id: `${c.code}-${String(i + 1).padStart(2, "0")}`,
      callsign: `${c.code}-${role.code}`,
      country: c.code,
      domain: role.domain,
      role: role.role,
      sources: structured?.sources ?? ["Google News", "Bing News (fallback)"],
      run: (ctx) => runner(agent, c, ctx),
    };
    return agent;
  }),
);
