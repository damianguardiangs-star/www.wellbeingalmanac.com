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
  kind: "report" | "corroborate" | "escalate" | "cross-border" | "brief";
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
}

export interface IntelSnapshot {
  generatedAt: string;
  durationMs: number;
  agents: AgentState[];
  signals: Signal[];
  alerts: FusedAlert[];
  messages: BusMessage[];
  countries: CountryPicture[];
  regionalBrief: string[];
}
