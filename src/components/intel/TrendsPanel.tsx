"use client";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Bot, TrendingDown, TrendingUp } from "lucide-react";
import { COUNTRY_BY_CODE, DOMAIN_LABEL } from "@/intel/config";
import {
  SEVERITY_LABEL,
  type AnalystAssessment,
  type AnalystStatus,
  type CountryCode,
  type CountryTrend,
  type Trends,
} from "@/intel/types";

/** Categorical slots validated for the dark surface (CVD + contrast), fixed per country. */
export const COUNTRY_COLOR: Record<CountryCode, string> = {
  ID: "#3987e5",
  TH: "#d95926",
  LA: "#199e70",
  KH: "#c98500",
  VN: "#d55181",
};
const ORDER: CountryCode[] = ["ID", "TH", "LA", "KH", "VN"];

const fmtTime = (t: string) =>
  new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const tooltipStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 6,
  fontSize: 12,
  color: "#e2e8f0",
};

export function Sparkline({ trend }: { trend?: CountryTrend }) {
  if (!trend || trend.series.length < 2) return <div className="h-7 text-[10px] text-slate-600 flex items-end">trend builds after 2+ sweeps</div>;
  return (
    <div className="h-7 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend.series} margin={{ top: 3, right: 3, bottom: 3, left: 3 }}>
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_, p) => (p?.[0] ? fmtTime(p[0].payload.t) : "")}
            formatter={(v) => [`${v}/100`, "Risk"]}
            cursor={{ stroke: "#475569", strokeWidth: 1 }}
          />
          <Line type="monotone" dataKey="risk" stroke={COUNTRY_COLOR[trend.country]} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Delta({ trend }: { trend?: CountryTrend }) {
  if (!trend || trend.delta24h === null) return null;
  const d = trend.delta24h;
  const Icon = d >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-mono ${d >= 10 ? "text-orange-300" : d <= -10 ? "text-emerald-300" : "text-slate-400"}`}>
      <Icon className="w-3 h-3" />
      {d >= 0 ? "+" : ""}
      {d} 24h
    </span>
  );
}

export function TrendsTab({ trends, country }: { trends: Trends; country: CountryCode | "ALL" }) {
  const shown = country === "ALL" ? ORDER : [country];
  const base = trends.countries.find((c) => c.country === "ID")!;
  const rows = base.series.map((p, i) => {
    const row: Record<string, number | string> = { t: p.t };
    for (const c of trends.countries) row[c.country] = c.series[i]?.risk ?? 0;
    return row;
  });

  // Direct end-of-line labels, nudged apart so close values don't collide.
  const placed: number[] = [];
  const placeLabel = (y: number) => {
    let out = y;
    for (let i = 0; i < 6 && placed.some((p) => Math.abs(p - out) < 12); i++) out += 12;
    placed.push(out);
    return out;
  };

  return (
    <div className="p-3 space-y-4 max-h-[76vh] overflow-y-auto">
      <div className="text-[11px] text-slate-400">
        {trends.sweeps} sweep{trends.sweeps === 1 ? "" : "s"} on record
        {trends.since ? ` since ${fmtTime(trends.since)}` : ""} · history: {trends.store.note}
      </div>

      {rows.length < 2 ? (
        <p className="text-sm text-slate-500 p-6 text-center">Trend lines appear once at least two sweeps have been stored.</p>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Country risk over time (0–100)</h3>
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-300 mb-1" aria-label="Legend">
            {shown.map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded" style={{ background: COUNTRY_COLOR[c] }} />
                {COUNTRY_BY_CODE[c].name}
              </span>
            ))}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 72, bottom: 4, left: -16 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="t"
                  tickFormatter={(t) =>
                    new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  }
                  stroke="#475569"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  minTickGap={40}
                />
                <YAxis domain={[0, 100]} stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(t) => fmtTime(String(t))} cursor={{ stroke: "#475569" }} />
                {[...shown]
                  .sort((a, b) => Number(rows[rows.length - 1]?.[b] ?? 0) - Number(rows[rows.length - 1]?.[a] ?? 0))
                  .map((c) => (
                  <Line
                    key={c}
                    type="monotone"
                    dataKey={c}
                    name={COUNTRY_BY_CODE[c].name}
                    stroke={COUNTRY_COLOR[c]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: "#0b1220", strokeWidth: 2 }}
                    isAnimationActive={false}
                    label={(props: { index?: number; x?: unknown; y?: unknown; value?: unknown }) =>
                      props.index === rows.length - 1 ? (
                        <text key={c} x={Number(props.x) + 6} y={placeLabel(Number(props.y)) + 4} fill="#cbd5e1" fontSize={11}>
                          {c} {String(props.value ?? "")}
                        </text>
                      ) : (
                        <g key={`${c}-${props.index}`} />
                      )
                    }
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <table className="w-full text-xs">
        <thead className="text-slate-400">
          <tr className="text-left">
            <th className="py-1 font-medium">Country</th>
            <th className="font-medium">Risk now</th>
            <th className="font-medium">vs 24h</th>
            <th className="font-medium">vs last sweep</th>
            <th className="font-medium">Streak</th>
            <th className="font-medium">Escalating vs 24h baseline</th>
          </tr>
        </thead>
        <tbody className="text-slate-200">
          {trends.countries
            .filter((c) => shown.includes(c.country))
            .map((c) => (
              <tr key={c.country} className="border-t border-slate-800">
                <td className="py-1.5">
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: COUNTRY_COLOR[c.country] }} />
                  {COUNTRY_BY_CODE[c.country].name}
                </td>
                <td className="font-mono">{c.series[c.series.length - 1]?.risk ?? "—"}</td>
                <td className="font-mono">{c.delta24h === null ? "—" : `${c.delta24h >= 0 ? "+" : ""}${c.delta24h}`}</td>
                <td className="font-mono">{c.deltaLast === null ? "—" : `${c.deltaLast >= 0 ? "+" : ""}${c.deltaLast}`}</td>
                <td className="font-mono">{c.streak === 0 ? "—" : `${c.streak > 0 ? "↑" : "↓"}${Math.abs(c.streak)}`}</td>
                <td className="text-slate-300">
                  {c.escalating.length
                    ? c.escalating.map((e) => `${DOMAIN_LABEL[e.domain]} ${e.now} (base ${e.baseline})`).join(" · ")
                    : "—"}
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <div className="grid md:grid-cols-2 gap-4 text-xs">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Escalations</h3>
          {trends.escalations.length === 0 ? (
            <p className="text-slate-500">Nothing running above its baseline.</p>
          ) : (
            <ul className="space-y-1 text-slate-300">
              {trends.escalations.map((l, i) => (
                <li key={i}>• {l}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Resolved since last sweep</h3>
          {trends.resolved.length === 0 ? (
            <p className="text-slate-500">No alerts dropped off.</p>
          ) : (
            <ul className="space-y-1 text-slate-400">
              {trends.resolved.map((r, i) => (
                <li key={i}>
                  <span className="font-mono">[{SEVERITY_LABEL[r.sev]}]</span> {r.headline}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const CONF_CLS = {
  low: "border-slate-600 text-slate-300",
  moderate: "border-sky-700 text-sky-300",
  high: "border-emerald-700 text-emerald-300",
};
const THREAT_CLS = {
  low: "text-slate-300",
  guarded: "text-sky-300",
  elevated: "text-amber-300",
  high: "text-orange-300",
  severe: "text-red-300",
};

export function AnalystBadge({ analyst, status }: { analyst: AnalystAssessment | null; status: AnalystStatus }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400" title={status.detail}>
      <Bot className={`w-3.5 h-3.5 ${analyst ? "text-violet-300" : "text-slate-500"}`} />
      {analyst ? (
        <>
          AI analyst · {analyst.model} · {fmtTime(analyst.generatedAt)}
          {status.state === "error" && <span className="text-amber-300"> · last refresh failed</span>}
        </>
      ) : status.state === "disabled" ? (
        "AI analyst off (rule-based)"
      ) : (
        <span className="text-amber-300">AI analyst unavailable</span>
      )}
    </div>
  );
}

export function RegionalAssessment({ analyst }: { analyst: AnalystAssessment }) {
  return (
    <div className="space-y-2 text-sm text-slate-300">
      <p className="leading-snug">{analyst.regional.summary}</p>
      <div className="space-y-1.5">
        {analyst.regional.key_judgements.map((k, i) => (
          <div key={i} className="text-xs">
            <span className={`px-1 py-0.5 mr-1 rounded border text-[9px] uppercase tracking-wider ${CONF_CLS[k.confidence]}`}>
              {k.confidence}
            </span>
            <span className="text-slate-200">{k.judgement}</span>
            <div className="text-slate-500 ml-1">Basis: {k.basis}</div>
          </div>
        ))}
      </div>
      {analyst.regional.watch_next_72h.length > 0 && (
        <div className="text-xs">
          <div className="text-slate-400 font-semibold">Watch next 72h</div>
          <ul className="list-disc ml-4 text-slate-300">
            {analyst.regional.watch_next_72h.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CountryAssessment({ a }: { a: AnalystAssessment["countries"][number] }) {
  return (
    <div className="space-y-1.5 text-sm text-slate-300 mb-3 pb-3 border-b border-slate-800">
      <div className="text-xs">
        AI threat level: <b className={`uppercase ${THREAT_CLS[a.threat_level]}`}>{a.threat_level}</b>
      </div>
      <p className="leading-snug">{a.situation}</p>
      <p className="leading-snug text-slate-400">
        <b className="text-slate-300">Next 72h:</b> {a.outlook_72h}
      </p>
      <p className="leading-snug text-xs rounded bg-sky-950/30 border border-sky-900 p-2">
        <b className="text-sky-300">Students &amp; travellers:</b> {a.student_traveller_guidance}
      </p>
      {a.indicators_to_watch.length > 0 && (
        <div className="text-xs text-slate-400">Indicators: {a.indicators_to_watch.join(" · ")}</div>
      )}
    </div>
  );
}
