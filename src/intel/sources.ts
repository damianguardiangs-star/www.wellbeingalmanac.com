/**
 * Source adapters. Every adapter hits a free, keyless public endpoint.
 * A per-run shared cache (`SharedCache`) means that when several agents need
 * the same feed (e.g. GDACS, USGS, FX, advisories) it is fetched once and the
 * result is shared between them — the agents' common memory.
 */

const UA = "WellbeingAlmanac-IntelSwarm/1.0 (+https://www.wellbeingalmanac.com)";
const TIMEOUT_MS = 12_000;

export class SharedCache {
  private store = new Map<string, Promise<unknown>>();
  get<T>(key: string, load: () => Promise<T>): Promise<T> {
    let p = this.store.get(key) as Promise<T> | undefined;
    if (!p) {
      p = load();
      this.store.set(key, p);
    }
    return p;
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const text = await fetchText(url);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${new URL(url).host} returned non-JSON`);
  }
}

// ───────────────────────────── News (RSS) ─────────────────────────────

export interface NewsItem {
  title: string;
  link: string;
  published: string;
  source: string;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? e)
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeXml(m[1]) : "";
}

export function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const block = m[0];
    let title = tag(block, "title");
    let source = tag(block, "source");
    // Google News appends " - Publisher" to titles.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    if (!source) {
      const dash = title.lastIndexOf(" - ");
      if (dash > 20) {
        source = title.slice(dash + 3);
        title = title.slice(0, dash);
      }
    }
    const pub = tag(block, "pubDate");
    const date = pub ? new Date(pub) : new Date();
    items.push({
      title,
      link: tag(block, "link"),
      published: isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
      source: source || "News",
    });
  }
  return items;
}

/** Google News search, falling back to Bing News if Google is unavailable. */
export async function searchNews(query: string): Promise<{ items: NewsItem[]; provider: string }> {
  const q = encodeURIComponent(`${query} when:3d`);
  try {
    const xml = await fetchText(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`);
    return { items: parseRss(xml), provider: "Google News" };
  } catch (googleErr) {
    try {
      const xml = await fetchText(
        `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&qft=interval%3d%228%22`,
      );
      return { items: parseRss(xml), provider: "Bing News" };
    } catch {
      throw googleErr;
    }
  }
}

// ───────────────────────────── Weather (Open-Meteo) ─────────────────────────────

export interface DailyWeather {
  date: string[];
  precipitation_sum: (number | null)[];
  apparent_temperature_max: (number | null)[];
  wind_gusts_10m_max: (number | null)[];
  weather_code: (number | null)[];
}

export async function weatherForecast(points: { lat: number; lon: number }[]): Promise<DailyWeather[]> {
  const lat = points.map((p) => p.lat).join(",");
  const lon = points.map((p) => p.lon).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum,apparent_temperature_max,wind_gusts_10m_max,weather_code&forecast_days=3&timezone=auto`;
  const data = await fetchJson<unknown>(url);
  const arr = (Array.isArray(data) ? data : [data]) as { daily: DailyWeather & { time: string[] } }[];
  return arr.map((d) => ({ ...d.daily, date: d.daily.time }));
}

export interface AirNow {
  us_aqi: number | null;
  pm2_5: number | null;
}

export async function airQuality(points: { lat: number; lon: number }[]): Promise<AirNow[]> {
  const lat = points.map((p) => p.lat).join(",");
  const lon = points.map((p) => p.lon).join(",");
  const data = await fetchJson<unknown>(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5`,
  );
  const arr = (Array.isArray(data) ? data : [data]) as { current: AirNow }[];
  return arr.map((d) => d.current);
}

// ───────────────────────────── Earthquakes (USGS) ─────────────────────────────

export interface Quake {
  id: string;
  mag: number;
  place: string;
  time: string;
  url: string;
  tsunami: boolean;
  lon: number;
  lat: number;
}

export async function usgsQuakes(cache: SharedCache): Promise<Quake[]> {
  return cache.get("usgs", async () => {
    const data = await fetchJson<{
      features: {
        id: string;
        properties: { mag: number; place: string; time: number; url: string; tsunami: number };
        geometry: { coordinates: [number, number, number] };
      }[];
    }>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson");
    return data.features.map((f) => ({
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place,
      time: new Date(f.properties.time).toISOString(),
      url: f.properties.url,
      tsunami: f.properties.tsunami === 1,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }));
  });
}

// ───────────────────────────── Disasters (GDACS) ─────────────────────────────

export interface GdacsEvent {
  id: string;
  type: string;
  name: string;
  alert: string;
  countries: string;
  from: string;
  url: string;
  description: string;
  lat?: number;
  lon?: number;
}

const GDACS_TYPES: Record<string, string> = {
  EQ: "Earthquake",
  TC: "Tropical cyclone",
  FL: "Flood",
  VO: "Volcano",
  DR: "Drought",
  WF: "Wildfire",
  TS: "Tsunami",
};

export async function gdacsEvents(cache: SharedCache): Promise<GdacsEvent[]> {
  return cache.get("gdacs", async () => {
    const data = await fetchJson<{
      features: {
        properties: {
          eventid: number;
          eventtype: string;
          name: string;
          alertlevel: string;
          country?: string;
          affectedcountries?: { countryname: string }[];
          fromdate: string;
          description?: string;
          url?: { report?: string };
        };
        geometry?: { type: string; coordinates: unknown };
      }[];
    }>("https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventlist=EQ;TC;FL;VO;DR;WF;TS");
    const seen = new Map<string, GdacsEvent>();
    for (const f of data.features ?? []) {
      const p = f.properties;
      const id = `${p.eventtype}-${p.eventid}`;
      const point = f.geometry?.type === "Point" ? (f.geometry.coordinates as [number, number]) : undefined;
      const prev = seen.get(id);
      if (prev) {
        if (point && prev.lat == null) Object.assign(prev, { lon: point[0], lat: point[1] });
        continue;
      }
      seen.set(id, {
        lon: point?.[0],
        lat: point?.[1],
        id,
        type: GDACS_TYPES[p.eventtype] ?? p.eventtype,
        name: p.name,
        alert: p.alertlevel,
        countries: [p.country ?? "", ...(p.affectedcountries ?? []).map((c) => c.countryname)].join(", "),
        from: p.fromdate,
        url: p.url?.report ?? "https://www.gdacs.org/",
        description: p.description ?? "",
      });
    }
    return [...seen.values()];
  });
}

// ───────────────────────────── FX ─────────────────────────────

export interface FxRates {
  updated: string;
  rates: Record<string, number>;
}

export async function fxRates(cache: SharedCache): Promise<FxRates> {
  return cache.get("fx", async () => {
    const data = await fetchJson<{ result: string; time_last_update_utc: string; rates: Record<string, number> }>(
      "https://open.er-api.com/v6/latest/USD",
    );
    if (data.result !== "success") throw new Error("FX provider error");
    return { updated: new Date(data.time_last_update_utc).toISOString(), rates: data.rates };
  });
}

// ───────────────────────────── Travel advisories ─────────────────────────────

export interface Advisory {
  issuer: string;
  title: string;
  level?: number;
  updated: string;
  url: string;
  summary: string;
}

export async function usAdvisories(cache: SharedCache): Promise<Advisory[]> {
  return cache.get("us-adv", async () => {
    const data = await fetchJson<{ Title: string; Link: string; Updated?: string; Published?: string; Summary?: string }[]>(
      "https://cadataapi.state.gov/api/TravelAdvisories",
    );
    return data.map((a) => {
      const lvl = a.Title.match(/Level\s*(\d)/i);
      return {
        issuer: "US State Dept",
        title: a.Title,
        level: lvl ? Number(lvl[1]) : undefined,
        updated: new Date(a.Updated ?? a.Published ?? Date.now()).toISOString(),
        url: a.Link,
        summary: decodeXml((a.Summary ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").slice(0, 400),
      };
    });
  });
}

export async function ukAdvisory(slug: string): Promise<Advisory> {
  const data = await fetchJson<{
    title: string;
    public_updated_at: string;
    details?: { change_description?: string };
  }>(`https://www.gov.uk/api/content/foreign-travel-advice/${slug}`);
  return {
    issuer: "UK FCDO",
    title: data.title,
    updated: new Date(data.public_updated_at).toISOString(),
    url: `https://www.gov.uk/foreign-travel-advice/${slug}`,
    summary: data.details?.change_description ?? "",
  };
}
