"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  ExternalLink,
  MapPin,
  Network,
  Radar,
  RefreshCw,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { DOMAIN_LABEL } from "@/intel/config";
import IntelMap, { type MapFocus } from "./IntelMap";
import {
  SEVERITY_LABEL,
  type AgentState,
  type BusMessage,
  type CountryCode,
  type Domain,
  type FusedAlert,
  type IntelSnapshot,
  type Severity,
  type Signal,
} from "@/intel/types";

const POLL_MS = 5 * 60_000;
const SEEN_KEY = "intel-seen-alerts";

const SEV_STYLE: Record<Severity, { chip: string; bar: string; text: string }> = {
  0: { chip: "bg-slate-800 text-slate-300 border-slate-700", bar: "bg-slate-500", text: "text-slate-400" },
  1: { chip: "bg-sky-950 text-sky-300 border-sky-800", bar: "bg-sky-500", text: "text-sky-300" },
  2: { chip: "bg-amber-950 text-amber-300 border-amber-800", bar: "bg-amber-500", text: "text-amber-300" },
  3: { chip: "bg-orange-950 text-orange-300 border-orange-700", bar: "bg-orange-500", text: "text-orange-300" },
  4: { chip: "bg-red-950 text-red-300 border-red-700", bar: "bg-red-500", text: "text-red-300" },
};

const FLAG: Record<CountryCode, string> = { ID: "🇮🇩", TH: "🇹🇭", LA: "🇱🇦", KH: "🇰🇭", VN: "🇻🇳" };

type Tab = "feed" | "alerts" | "comms" | "agents";

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function SevChip({ s }: { s: Severity }) {
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-semibold tracking-wider ${SEV_STYLE[s].chip}`}>
      {SEVERITY_LABEL[s]}
    </span>
  );
}

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function writeSeen(s: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-500)));
  } catch {
    /* storage unavailable */
  }
}

export default function IntelDashboard() {
  const [snap, setSnap] = useState<IntelSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("feed");
  const [country, setCountry] = useState<CountryCode | "ALL">("ALL");
  const [domain, setDomain] = useState<Domain | "ALL">("ALL");
  const [minSev, setMinSev] = useState<Severity>(0);
  const [q, setQ] = useState("");
  const [notify, setNotify] = useState(false);
  const [toasts, setToasts] = useState<FusedAlert[]>([]);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const showOnMap = useCallback((id: string) => {
    setFocus({ id, nonce: Date.now() });
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const [, tick] = useState(0);
  const notifyRef = useRef(false);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  const announce = useCallback((s: IntelSnapshot) => {
    const seen = readSeen();
    const fresh = s.alerts.filter((a) => a.severity >= 3 && !seen.has(a.id));
    if (!fresh.length) return;
    fresh.forEach((a) => seen.add(a.id));
    writeSeen(seen);
    setToasts((t) => [...fresh.slice(0, 3), ...t].slice(0, 4));
    const ids = new Set(fresh.map((a) => a.id));
    setTimeout(() => setToasts((t) => t.filter((x) => !ids.has(x.id))), 15_000);
    if (notifyRef.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
      for (const a of fresh.slice(0, 3)) {
        new Notification(`[${SEVERITY_LABEL[a.severity]}] SEA Intel`, { body: a.headline, tag: a.id });
      }
    }
  }, []);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/intel${force ? "?refresh=1" : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data: IntelSnapshot = await res.json();
        setSnap(data);
        announce(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [announce],
  );

  useEffect(() => {
    const first = setTimeout(() => {
      setNotify(typeof Notification !== "undefined" && Notification.permission === "granted");
      load();
    }, 0);
    const poll = setInterval(() => load(), POLL_MS);
    const clock = setInterval(() => tick((n) => n + 1), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  async function toggleNotify() {
    if (notify) return setNotify(false);
    if (typeof Notification === "undefined") return alert("This browser does not support notifications.");
    const p = await Notification.requestPermission();
    setNotify(p === "granted");
  }

  const signalById = useMemo(() => new Map(snap?.signals.map((s) => [s.id, s]) ?? []), [snap]);

  const feed = useMemo(() => {
    if (!snap) return [];
    const needle = q.trim().toLowerCase();
    return snap.signals.filter(
      (s) =>
        (country === "ALL" || s.country === country) &&
        (domain === "ALL" || s.domain === domain) &&
        s.severity >= minSev &&
        (!needle || `${s.title} ${s.source} ${s.tags.join(" ")}`.toLowerCase().includes(needle)),
    );
  }, [snap, country, domain, minSev, q]);

  const alerts = useMemo(
    () => snap?.alerts.filter((a) => country === "ALL" || a.countries.includes(country)) ?? [],
    [snap, country],
  );
  const comms = useMemo(
    () =>
      snap?.messages.filter((m) => country === "ALL" || m.from.startsWith(country) || m.to.startsWith(country)) ?? [],
    [snap, country],
  );

  const online = snap?.agents.filter((a) => a.status !== "error").length ?? 0;
  const selected = snap?.countries.find((c) => c.country === country);

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-200 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#070b12]/90 backdrop-blur">
        <div className="max-w-[1500px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
              <Radar className={`w-5 h-5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h1 className="font-bold tracking-wide text-white leading-none">SEA INTEL SWARM</h1>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                100 agents · ID · TH · LA · KH · VN · open-source intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${online > 80 ? "bg-emerald-400" : online > 0 ? "bg-amber-400" : "bg-red-500"} animate-pulse`} />
              {snap ? `${online}/100 agents online` : "deploying…"}
            </span>
            {snap && <span className="text-slate-400 hidden sm:inline">sweep {ago(snap.generatedAt)} · {(snap.durationMs / 1000).toFixed(1)}s</span>}
            <button
              onClick={toggleNotify}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border ${notify ? "border-emerald-600 text-emerald-300 bg-emerald-950/40" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}
              title="Get a browser notification for new HIGH / CRITICAL fused alerts"
            >
              {notify ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              {notify ? "Alerts on" : "Enable alerts"}
            </button>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Sweep now
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 py-4 space-y-4">
        {error && (
          <div className="border border-red-800 bg-red-950/40 text-red-300 rounded p-3 text-sm">Sweep failed: {error}</div>
        )}

        {snap && online < 50 && (
          <div className="border border-amber-800 bg-amber-950/30 text-amber-200 rounded p-3 text-sm">
            Degraded: only {online}/100 agents reached their sources. Risk scores below are incomplete — see the Agents tab for
            the failing sources (usually blocked outbound network access).
          </div>
        )}

        {!snap ? (
          <Deploying />
        ) : (
          <>
            {/* Country risk strip */}
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <button
                onClick={() => setCountry("ALL")}
                className={`text-left rounded-lg border p-3 transition ${country === "ALL" ? "border-emerald-500 bg-emerald-950/20" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}
              >
                <div className="text-xs text-slate-400 font-mono">REGION</div>
                <div className="text-lg font-bold text-white">All 5 countries</div>
                <div className="text-xs text-slate-400 mt-1">
                  {snap.signals.length} signals · {snap.alerts.length} fused alerts
                </div>
                <div className="text-xs text-slate-500 mt-1">{snap.messages.length} bus messages</div>
              </button>
              {snap.countries.map((c) => (
                <button
                  key={c.country}
                  onClick={() => setCountry(c.country)}
                  className={`text-left rounded-lg border p-3 transition ${country === c.country ? "border-emerald-500 bg-emerald-950/20" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      {FLAG[c.country]} {c.name}
                    </span>
                    {c.agentsOk < c.agentsTotal / 2 ? (
                      <span className="px-1.5 py-0.5 rounded border text-[10px] font-semibold tracking-wider border-amber-800 text-amber-300">
                        NO DATA
                      </span>
                    ) : (
                      <SevChip s={c.level} />
                    )}
                  </div>
                  <div className="flex items-end gap-2 mt-2">
                    <span className={`text-3xl font-bold font-mono ${SEV_STYLE[c.level].text}`}>
                      {c.agentsOk < c.agentsTotal / 2 ? "—" : c.risk}
                    </span>
                    <span className="text-xs text-slate-500 mb-1">/100 risk</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded mt-1 overflow-hidden">
                    <div className={`h-full ${SEV_STYLE[c.level].bar}`} style={{ width: `${c.risk}%` }} />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 truncate">
                    {c.topDomains.map((d) => DOMAIN_LABEL[d.domain]).join(" · ") || (c.agentsOk < c.agentsTotal / 2 ? "Sources unreachable" : "Quiet")}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {c.agentsOk}/{c.agentsTotal} agents{c.advisoryLevel ? ` · US L${c.advisoryLevel}` : ""}
                  </div>
                </button>
              ))}
            </section>

            {/* Incident map — follows the feed filters and the selected country */}
            <section ref={mapRef} className="scroll-mt-20">
              <IntelMap signals={feed} alerts={alerts} country={country} focus={focus} />
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Main panel */}
              <section className="xl:col-span-2 rounded-lg border border-slate-800 bg-slate-900/30">
                <nav className="flex border-b border-slate-800 text-sm overflow-x-auto">
                  {(
                    [
                      ["feed", "Intel feed", Activity, feed.length],
                      ["alerts", "Fused alerts", AlertTriangle, alerts.length],
                      ["comms", "Agent comms", Network, comms.length],
                      ["agents", "Agents", Users, 100],
                    ] as const
                  ).map(([id, label, Icon, n]) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`flex items-center gap-2 px-4 py-2.5 border-b-2 whitespace-nowrap ${tab === id ? "border-emerald-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}
                    >
                      <Icon className="w-4 h-4" /> {label}
                      <span className="text-[10px] font-mono bg-slate-800 rounded px-1.5">{n}</span>
                    </button>
                  ))}
                </nav>

                {tab === "feed" && (
                  <div>
                    <div className="flex flex-wrap gap-2 p-3 border-b border-slate-800">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-500" />
                        <input
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Search headlines, sources, tags…"
                          className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2 py-1.5 text-sm outline-none focus:border-emerald-600"
                        />
                      </div>
                      <select
                        value={domain}
                        onChange={(e) => setDomain(e.target.value as Domain | "ALL")}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-sm"
                      >
                        <option value="ALL">All disciplines</option>
                        {Object.entries(DOMAIN_LABEL)
                          .filter(([d]) => d !== "fusion")
                          .map(([d, l]) => (
                            <option key={d} value={d}>
                              {l}
                            </option>
                          ))}
                      </select>
                      <select
                        value={minSev}
                        onChange={(e) => setMinSev(Number(e.target.value) as Severity)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-sm"
                      >
                        {([0, 1, 2, 3, 4] as Severity[]).map((s) => (
                          <option key={s} value={s}>
                            {s === 0 ? "Any severity" : `${SEVERITY_LABEL[s]}+`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ul className="divide-y divide-slate-800/70 max-h-[70vh] overflow-y-auto">
                      {feed.length === 0 && <Empty text="No signals match these filters." />}
                      {feed.map((s) => (
                        <SignalRow key={s.id} s={s} agent={snap.agents.find((a) => a.id === s.agentId)} onMap={showOnMap} />
                      ))}
                    </ul>
                  </div>
                )}

                {tab === "alerts" && (
                  <ul className="divide-y divide-slate-800/70 max-h-[76vh] overflow-y-auto">
                    {alerts.length === 0 && <Empty text="No fused alerts — agents have not corroborated any events yet." />}
                    {alerts.map((a) => (
                      <AlertRow key={a.id} a={a} signalById={signalById} onMap={showOnMap} />
                    ))}
                  </ul>
                )}

                {tab === "comms" && (
                  <ul className="divide-y divide-slate-800/70 max-h-[76vh] overflow-y-auto font-mono text-xs">
                    {comms.length === 0 && <Empty text="No bus traffic yet." />}
                    {comms.map((m) => (
                      <CommsRow key={m.id} m={m} />
                    ))}
                  </ul>
                )}

                {tab === "agents" && <AgentGrid agents={snap.agents} country={country} />}
              </section>

              {/* Side panel */}
              <aside className="space-y-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    {selected ? `${FLAG[selected.country]} ${selected.name} brief` : "Regional brief · SEA-HQ"}
                  </h2>
                  <ul className="space-y-1.5 text-sm text-slate-300">
                    {(selected ? selected.brief : snap.regionalBrief).map((line, i) => (
                      <li key={i} className="leading-snug">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" /> Priority alerts
                  </h2>
                  <ul className="space-y-2">
                    {alerts.filter((a) => a.severity >= 3).length === 0 && (
                      <li className="text-sm text-slate-500">Nothing HIGH or CRITICAL right now.</li>
                    )}
                    {alerts
                      .filter((a) => a.severity >= 3)
                      .slice(0, 8)
                      .map((a) => (
                        <li key={a.id} className="text-sm">
                          <SevChip s={a.severity} />{" "}
                          <button onClick={() => setTab("alerts")} className="text-left hover:text-white">
                            {a.headline}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-400 space-y-1">
                  <p>
                    <b className="text-slate-300">How it works:</b> 19 specialist collectors per country send reports to
                    a country fusion lead (agent 20). Leads cross-check those reports and task each other&apos;s agents, then
                    brief SEA-HQ, which looks for patterns across borders.
                  </p>
                  <p>Sources: Google/Bing News, Open-Meteo, CAMS, USGS, GDACS, US State Dept, UK FCDO, open.er-api.</p>
                  <p>Polls every 5 min; server re-sweeps at most every 10 min. Automated triage — verify before acting.</p>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map((a) => (
          <div key={a.id} className={`rounded-lg border p-3 shadow-xl bg-[#0b1220] ${SEV_STYLE[a.severity].chip}`}>
            <div className="flex items-center justify-between gap-2">
              <SevChip s={a.severity} />
              <button onClick={() => setToasts((t) => t.filter((x) => x.id !== a.id))} className="text-xs opacity-70 hover:opacity-100">
                dismiss
              </button>
            </div>
            <p className="text-sm text-slate-100 mt-1.5">{a.headline}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <li className="p-8 text-center text-sm text-slate-500">{text}</li>;
}

function SignalRow({ s, agent, onMap }: { s: Signal; agent?: AgentState; onMap: (id: string) => void }) {
  return (
    <li className="p-3 hover:bg-slate-900/60 flex gap-3">
      <div className={`w-1 rounded ${SEV_STYLE[s.severity].bar} shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
          <SevChip s={s.severity} />
          <span>{FLAG[s.country]}</span>
          <span className="text-slate-300">{DOMAIN_LABEL[s.domain]}</span>
          <span>· {agent?.callsign ?? s.agentId}</span>
          <span>· {ago(s.time)}</span>
          <button
            onClick={() => onMap(s.id)}
            className="ml-auto flex items-center gap-1 text-slate-400 hover:text-emerald-300"
            title="Show on map"
          >
            <MapPin className="w-3 h-3" />
            {s.geo === "country" ? "approx." : s.place ?? "map"}
          </button>
        </div>
        <p className="text-sm text-slate-100 mt-1 leading-snug">
          {s.url ? (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {s.title} <ExternalLink className="inline w-3 h-3 opacity-50" />
            </a>
          ) : (
            s.title
          )}
        </p>
        {s.summary && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.summary}</p>}
        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="text-[10px] text-slate-500">{s.source}</span>
          {s.tags.slice(0, 5).map((t) => (
            <span key={t} className="text-[10px] px-1.5 rounded bg-slate-800 text-slate-400">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

function AlertRow({ a, signalById, onMap }: { a: FusedAlert; signalById: Map<string, Signal>; onMap: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="p-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
          <SevChip s={a.severity} />
          <span>{a.countries.map((c) => FLAG[c]).join(" ")}</span>
          <span>{a.domains.map((d) => DOMAIN_LABEL[d]).join(" + ")}</span>
          <span>· {a.signalIds.length} signals · {a.agents.length} agents</span>
          {a.severity >= 2 && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onMap(a.id);
              }}
              className="ml-auto flex items-center gap-1 hover:text-emerald-300"
            >
              <MapPin className="w-3 h-3" /> map
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-white mt-1">{a.headline}</p>
        <p className="text-xs text-slate-400 mt-1">{a.rationale}</p>
      </button>
      {open && (
        <ul className="mt-2 ml-3 border-l border-slate-700 pl-3 space-y-1">
          {a.signalIds.map((id) => {
            const s = signalById.get(id);
            if (!s) return null;
            return (
              <li key={id} className="text-xs text-slate-300">
                <span className="font-mono text-slate-500">{s.agentId}</span>{" "}
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

const KIND_STYLE: Record<BusMessage["kind"], string> = {
  report: "text-slate-400",
  corroborate: "text-emerald-300",
  escalate: "text-orange-300",
  "cross-border": "text-fuchsia-300",
  brief: "text-sky-300",
};

function CommsRow({ m }: { m: BusMessage }) {
  return (
    <li className="px-3 py-2 hover:bg-slate-900/60">
      <span className="text-slate-500">{new Date(m.time).toLocaleTimeString()}</span>{" "}
      <span className="text-slate-200">{m.from}</span>
      <span className="text-slate-600"> → </span>
      <span className="text-slate-200">{m.to}</span>{" "}
      <span className={`uppercase ${KIND_STYLE[m.kind]}`}>[{m.kind}]</span>{" "}
      <span className="text-slate-300 font-sans">{m.text}</span>
    </li>
  );
}

const STATUS_STYLE: Record<AgentState["status"], string> = {
  idle: "border-slate-700 bg-slate-900",
  ok: "border-emerald-700 bg-emerald-950/40",
  empty: "border-slate-600 bg-slate-900",
  error: "border-red-800 bg-red-950/40",
};

function AgentGrid({ agents, country }: { agents: AgentState[]; country: CountryCode | "ALL" }) {
  const shown = agents.filter((a) => country === "ALL" || a.country === country);
  const groups = [...new Set(shown.map((a) => a.country))];
  return (
    <div className="p-3 space-y-4 max-h-[76vh] overflow-y-auto">
      <div className="flex gap-4 text-[11px] text-slate-400">
        <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1" />reporting</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-slate-500 mr-1" />nothing to report</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-red-500 mr-1" />source unreachable</span>
      </div>
      {groups.map((c) => (
        <div key={c}>
          <h3 className="text-xs font-mono text-slate-400 mb-2">
            {FLAG[c]} {c} — 20 agents
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {shown
              .filter((a) => a.country === c)
              .map((a) => (
                <div key={a.id} className={`rounded border p-2 ${STATUS_STYLE[a.status]}`} title={a.error ?? a.sources.join(", ")}>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>{a.id}</span>
                    <span>{a.signalCount}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-100">{a.callsign}</div>
                  <div className="text-[10px] text-slate-400 leading-tight line-clamp-2">{a.role}</div>
                  {a.error && <div className="text-[10px] text-red-400 mt-1 line-clamp-2">{a.error}</div>}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Deploying() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-8 text-center">
      <Radar className="w-10 h-10 text-emerald-400 mx-auto animate-spin" />
      <p className="mt-4 text-white font-semibold">Deploying 100 agents across Indonesia, Thailand, Laos, Cambodia and Vietnam…</p>
      <p className="text-sm text-slate-400 mt-1">The first sweep queries every source and can take up to a minute.</p>
      <div className="grid grid-cols-10 gap-1.5 max-w-md mx-auto mt-6">
        {Array.from({ length: 100 }, (_, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm bg-emerald-500/30 animate-pulse"
            style={{ animationDelay: `${(i % 10) * 80 + Math.floor(i / 10) * 40}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
