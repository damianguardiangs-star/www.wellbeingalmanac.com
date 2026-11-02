export type CountryCode = "ID" | "TH" | "LA" | "KH" | "VN";

export type Domain =
  | "weather"
  | "air"
  | "seismic"
  | "disaster"
  | "crime"
  | "security"
  | "politics"
  | "geopolitics"
  | "unrest"
  | "commodities"
  | "currency"
  | "maritime"
  | "aviation"
  | "advisory"
  | "students"
  | "health"
  | "economy"
  | "cyber"
  | "infrastructure"
  | "fusion";

/** 0 info · 1 low · 2 medium · 3 high · 4 critical */
export type Severity = 0 | 1 | 2 | 3 | 4;

export const SEVERITY_LABEL: Record<Severity, string> = {
  0: "INFO",
  1: "LOW",
  2: "MEDIUM",
  3: "HIGH",
  4: "CRITICAL",
};

export interface Signal {
  id: string;
  agentId: string;
  country: CountryCode;
  domain: Domain;
  severity: Severity;
  title: string;
  summary?: string;
  url?: string;
  source: string;
  /** ISO timestamp of the underlying event / article */
  time: string;
  /** Normalised keywords used by the fusion layer to correlate signals */
  tags: string[];
  /** Where it is happening. */
  lat: number;
  lon: number;
  /** exact = sensor/feed coordinates, place = matched a named place, country = centroid fallback */
  geo: "exact" | "place" | "country";
  place?: string;
}

export type AgentStatus = "idle" | "ok" | "empty" | "error";

export interface AgentState {
  id: string;
  callsign: string;
  country: CountryCode;
  domain: Domain;
  role: string;
  sources: string[];
  status: AgentStatus;
  lastRun?: string;
  durationMs?: number;
  signalCount: number;
  error?: string;
}

/** A message passed between agents on the bus. */
export interface BusMessage {
  id: string;
  time: string;
  from: string;
  to: string;
  kind: "report" | "corroborate" | "escalate" | "cross-border" | "brief" | "heads-up" | "confirm" | "no-evidence";
  text: string;
  signalIds: string[];
}

export interface FusedAlert {
  id: string;
  countries: CountryCode[];
  domains: Domain[];
  severity: Severity;
  headline: string;
  rationale: string;
  signalIds: string[];
  agents: string[];
  time: string;
  lat: number;
  lon: number;
  geo: "exact" | "place" | "country";
}

export type ImpactStatus = "observed" | "confirmed" | "projected" | "no-evidence";
export type Horizon = "hours" | "days" | "weeks";

/** A projected knock-on effect of one incident on another agent's patch. */
export interface Impact {
  id: string;
  from: CountryCode;
  to: CountryCode;
  sourceAgent: string; // callsign
  targetAgent: string; // callsign
  domain: Domain;
  effect: string;
  mechanism: string;
  horizon: Horizon;
  confidence: number; // 0–1
  severity: Severity;
  status: ImpactStatus;
  evidence: string[]; // signal ids
  toLat: number;
  toLon: number;
}

/** One triggering incident and everything the swarm thinks it will cause. */
export interface ImpactChain {
  id: string;
  event: string; // event class label
  from: CountryCode;
  trigger: string; // signal id
  supporting: string[]; // other signal ids of the same event
  headline: string;
  severity: Severity;
  lat: number;
  lon: number;
  interpretation: string;
  impacts: Impact[];
}

export interface CountryPicture {
  country: CountryCode;
  name: string;
  risk: number; // 0–100
  level: Severity;
  topDomains: { domain: Domain; score: number }[];
  brief: string[];
  advisoryLevel?: number;
  agentsOk: number;
  agentsTotal: number;
  /** Knock-on effects projected into this country from incidents elsewhere. */
  inbound: number;
}

export interface IntelSnapshot {
  generatedAt: string;
  durationMs: number;
  agents: AgentState[];
  signals: Signal[];
  alerts: FusedAlert[];
  messages: BusMessage[];
  chains: ImpactChain[];
  countries: CountryPicture[];
  regionalBrief: string[];
}
