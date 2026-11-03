/**
 * Sweep history — lets the agents see trends across sweeps instead of just "now".
 *
 * Storage backends, picked automatically:
 *  - Redis over REST (Upstash / Vercel KV) when KV_REST_API_URL + KV_REST_API_TOKEN
 *    (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) are set → durable.
 *  - A local JSON-lines file otherwise (INTEL_DATA_DIR, default ./.data; /tmp on Vercel,
 *    where it only lives as long as the server instance).
 */
import { promises as fs } from "fs";
import path from "path";
import type { CountryCode, Domain, Severity } from "./types";

export interface SweepRecord {
  t: string;
  online: number;
  signals: number;
  risk: Record<CountryCode, number>;
  inbound: Record<CountryCode, number>;
  /** Weighted signal score per domain per country */
  domains: Record<CountryCode, Partial<Record<Domain, number>>>;
  alerts: { id: string; sev: Severity; headline: string; countries: CountryCode[] }[];
  chains: { id: string; event: string; from: CountryCode; sev: Severity; verified: number; total: number }[];
}

export interface StoreInfo {
  backend: "redis" | "file";
  durable: boolean;
  note: string;
}

const KEY = "intel:history";
const META_PREFIX = "intel:meta:";
const MAX_RECORDS = Number(process.env.INTEL_HISTORY_MAX ?? 2000); // ~3 weeks at 15-minute sweeps

interface Store {
  info: StoreInfo;
  append(rec: SweepRecord): Promise<void>;
  /** Newest first */
  list(limit: number): Promise<SweepRecord[]>;
  getMeta<T>(key: string): Promise<T | null>;
  setMeta(key: string, value: unknown): Promise<void>;
}

// ───────────────────────────── Redis REST ─────────────────────────────

function redisStore(url: string, token: string): Store {
  async function pipeline(cmds: (string | number)[][]): Promise<{ result?: unknown; error?: string }[]> {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`history store responded ${res.status}`);
    return res.json();
  }
  return {
    info: { backend: "redis", durable: true, note: "Redis (durable)" },
    async append(rec) {
      await pipeline([
        ["LPUSH", KEY, JSON.stringify(rec)],
        ["LTRIM", KEY, 0, MAX_RECORDS - 1],
      ]);
    },
    async list(limit) {
      const [r] = await pipeline([["LRANGE", KEY, 0, limit - 1]]);
      return ((r.result as string[]) ?? []).map((s) => JSON.parse(s) as SweepRecord);
    },
    async getMeta<T>(key: string) {
      const [r] = await pipeline([["GET", META_PREFIX + key]]);
      return r.result ? (JSON.parse(r.result as string) as T) : null;
    },
    async setMeta(key, value) {
      await pipeline([["SET", META_PREFIX + key, JSON.stringify(value)]]);
    },
  };
}

// ───────────────────────────── File ─────────────────────────────

function fileStore(dir: string, durable: boolean): Store {
  const file = path.join(dir, "history.jsonl");
  const metaFile = (k: string) => path.join(dir, `meta-${k.replace(/[^a-z0-9_-]/gi, "_")}.json`);
  let cache: SweepRecord[] | null = null; // newest first

  async function load(): Promise<SweepRecord[]> {
    if (cache) return cache;
    try {
      const text = await fs.readFile(file, "utf8");
      cache = text
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as SweepRecord)
        .reverse();
    } catch {
      cache = [];
    }
    return cache;
  }

  return {
    info: {
      backend: "file",
      durable,
      note: durable
        ? `Local file (${file})`
        : "Temporary file — history resets when the server instance recycles. Add Upstash/Vercel KV for durable history.",
    },
    async append(rec) {
      const all = await load();
      all.unshift(rec);
      if (all.length > MAX_RECORDS) all.length = MAX_RECORDS;
      await fs.mkdir(dir, { recursive: true });
      if (all.length === MAX_RECORDS) {
        await fs.writeFile(file, [...all].reverse().map((r) => JSON.stringify(r)).join("\n") + "\n");
      } else {
        await fs.appendFile(file, JSON.stringify(rec) + "\n");
      }
    },
    async list(limit) {
      return (await load()).slice(0, limit);
    },
    async getMeta<T>(key: string) {
      try {
        return JSON.parse(await fs.readFile(metaFile(key), "utf8")) as T;
      } catch {
        return null;
      }
    },
    async setMeta(key, value) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(metaFile(key), JSON.stringify(value));
    },
  };
}

let store: Store | undefined;

export function getStore(): Store {
  if (store) return store;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) store = redisStore(url, token);
  else if (process.env.VERCEL) store = fileStore("/tmp/intel", false);
  else store = fileStore(process.env.INTEL_DATA_DIR ?? path.join(process.cwd(), ".data"), true);
  return store;
}
