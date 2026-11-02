"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { COUNTRY_BY_CODE, DOMAIN_LABEL } from "@/intel/config";
import { SEVERITY_LABEL, type CountryCode, type FusedAlert, type Severity, type Signal } from "@/intel/types";

export const SEV_HEX: Record<Severity, string> = {
  0: "#64748b",
  1: "#0ea5e9",
  2: "#f59e0b",
  3: "#f97316",
  4: "#ef4444",
};

const REGION_BOUNDS: [[number, number], [number, number]] = [
  [-11.5, 94.5],
  [23.5, 141.5],
];

export interface MapFocus {
  id: string;
  nonce: number;
}

interface Props {
  signals: Signal[];
  alerts: FusedAlert[];
  country: CountryCode | "ALL";
  focus: MapFocus | null;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Deterministic jitter so markers sharing a location (e.g. country-level fallbacks) don't stack. */
function jitter(id: string, spread: number): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const angle = ((h >>> 0) % 360) * (Math.PI / 180);
  const r = (((h >>> 9) % 1000) / 1000) * spread;
  return [Math.sin(angle) * r, Math.cos(angle) * r];
}

export default function IntelMap({ signals, alerts, country, focus }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layers = useRef<{ signals: Leaflet.LayerGroup; alerts: Leaflet.LayerGroup } | null>(null);
  const markers = useRef(new Map<string, Leaflet.CircleMarker>());
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState({ incidents: true, alerts: true, approx: true });

  // Create the map once (Leaflet needs `window`, so it is imported on the client only).
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const lf = mod.default ?? mod;
      L.current = lf;
      const m = lf.map(el.current, { zoomControl: true, attributionControl: true, worldCopyJump: true, minZoom: 3 });
      lf.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 18,
      }).addTo(m);
      m.fitBounds(REGION_BOUNDS);
      layers.current = { signals: lf.layerGroup().addTo(m), alerts: lf.layerGroup().addTo(m) };
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Redraw markers whenever the filtered data or layer toggles change.
  useEffect(() => {
    const lf = L.current;
    if (!ready || !lf || !layers.current) return;
    const { signals: sl, alerts: al } = layers.current;
    sl.clearLayers();
    al.clearLayers();
    markers.current.clear();

    if (show.incidents) {
      // Draw low severity first so critical markers sit on top.
      for (const s of [...signals].sort((a, b) => a.severity - b.severity)) {
        if (s.geo === "country" && !show.approx) continue;
        const [dy, dx] = s.geo === "exact" ? [0, 0] : jitter(s.id, s.geo === "country" ? 0.9 : 0.06);
        const approx = s.geo === "country";
        const mk = lf.circleMarker([s.lat + dy, s.lon + dx], {
          radius: 4 + s.severity * 2,
          color: SEV_HEX[s.severity],
          weight: approx ? 1.5 : 1,
          dashArray: approx ? "3 3" : undefined,
          fillColor: SEV_HEX[s.severity],
          fillOpacity: approx ? 0.08 : 0.55,
          opacity: 0.9,
        });
        const where =
          s.geo === "exact" ? "Exact location (sensor / feed)" : s.geo === "place" ? `Located: ${s.place}` : `Approximate — ${COUNTRY_BY_CODE[s.country].name} (no place named)`;
        mk.bindPopup(
          `<div class="intel-pop"><b style="color:${SEV_HEX[s.severity]}">${SEVERITY_LABEL[s.severity]}</b> · ${esc(DOMAIN_LABEL[s.domain])} · ${esc(s.agentId)}<br/>` +
            `<span class="t">${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)}</span>` +
            `<br/><span class="m">${esc(where)} · ${esc(s.source)}</span></div>`,
          { maxWidth: 320 },
        );
        mk.bindTooltip(esc(s.title.slice(0, 80)), { direction: "top", opacity: 0.9 });
        mk.addTo(sl);
        markers.current.set(s.id, mk);
      }
    }

    if (show.alerts) {
      for (const a of alerts) {
        if (a.severity < 2) continue;
        const ring = lf.circleMarker([a.lat, a.lon], {
          radius: 14 + a.severity * 3,
          color: SEV_HEX[a.severity],
          weight: 2.5,
          fill: false,
          className: "intel-pulse",
        });
        ring.bindPopup(
          `<div class="intel-pop"><b style="color:${SEV_HEX[a.severity]}">FUSED ${SEVERITY_LABEL[a.severity]}</b> · ${a.signalIds.length} signals · ${a.agents.length} agents<br/>` +
            `<span class="t">${esc(a.headline)}</span><br/><span class="m">${esc(a.rationale.slice(0, 260))}</span></div>`,
          { maxWidth: 340 },
        );
        ring.addTo(al);
        markers.current.set(a.id, ring);
      }
    }
  }, [ready, signals, alerts, show]);

  // Zoom to the selected country.
  useEffect(() => {
    if (!ready || !map.current) return;
    if (country === "ALL") map.current.flyToBounds(REGION_BOUNDS, { duration: 0.8 });
    else {
      const [minLon, minLat, maxLon, maxLat] = COUNTRY_BY_CODE[country].bbox;
      map.current.flyToBounds(
        [
          [minLat, minLon],
          [maxLat, maxLon],
        ],
        { duration: 0.8 },
      );
    }
  }, [ready, country]);

  // Fly to a specific incident / alert when asked from the feed.
  useEffect(() => {
    if (!ready || !focus || !map.current) return;
    const mk = markers.current.get(focus.id);
    if (!mk) return;
    map.current.flyTo(mk.getLatLng(), Math.max(map.current.getZoom(), 7), { duration: 0.8 });
    setTimeout(() => mk.openPopup(), 850);
  }, [ready, focus]);

  const located = signals.filter((s) => s.geo !== "country").length;

  return (
    <div className="relative rounded-lg border border-slate-800 overflow-hidden intel-map">
      <div ref={el} className="h-[440px] md:h-[520px] w-full bg-[#0b1220]" />
      <div className="absolute top-3 right-3 z-[500] bg-[#070b12]/90 border border-slate-700 rounded-md p-2.5 text-[11px] text-slate-300 space-y-1.5 max-w-[210px]">
        <div className="font-semibold text-white text-xs">Map layers</div>
        {(
          [
            ["incidents", "Incidents"],
            ["alerts", "Fused alerts (rings)"],
            ["approx", "Country-level (approx.)"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={show[k]} onChange={(e) => setShow((v) => ({ ...v, [k]: e.target.checked }))} />
            {label}
          </label>
        ))}
        <div className="pt-1 border-t border-slate-700 flex flex-wrap gap-x-2 gap-y-1">
          {([4, 3, 2, 1, 0] as Severity[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: SEV_HEX[s] }} />
              {SEVERITY_LABEL[s]}
            </span>
          ))}
        </div>
        <div className="text-slate-500">
          {located}/{signals.length} pinned to a place · dashed = approximate
        </div>
      </div>
    </div>
  );
}
