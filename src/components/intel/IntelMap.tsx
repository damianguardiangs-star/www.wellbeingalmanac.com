"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { COUNTRY_BY_CODE, DOMAIN_LABEL } from "@/intel/config";
import {
  SEVERITY_LABEL,
  type CountryCode,
  type FusedAlert,
  type ImpactChain,
  type Severity,
  type Signal,
} from "@/intel/types";

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
  chains: ImpactChain[];
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

/** A gentle great-arc-like curve between two points so arrows don't overlap straight lines. */
function curve(a: [number, number], b: [number, number], bend = 0.2, n = 24): [number, number][] {
  const [y1, x1] = a;
  const [y2, x2] = b;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [(1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t * t * y2, (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2];
  });
}

export default function IntelMap({ signals, alerts, chains, country, focus }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layers = useRef<{ signals: Leaflet.LayerGroup; alerts: Leaflet.LayerGroup; arcs: Leaflet.LayerGroup } | null>(null);
  const markers = useRef(new Map<string, Leaflet.CircleMarker>());
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState({ incidents: true, alerts: true, arcs: true, approx: true });

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
      layers.current = { arcs: lf.layerGroup().addTo(m), signals: lf.layerGroup().addTo(m), alerts: lf.layerGroup().addTo(m) };
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
    const { signals: sl, alerts: al, arcs } = layers.current;
    sl.clearLayers();
    al.clearLayers();
    arcs.clearLayers();
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

    if (show.arcs) {
      // Knock-on arcs: from the triggering incident to where the effect lands.
      for (const c of chains) {
        for (const i of c.impacts) {
          if (i.status === "no-evidence") continue;
          if (Math.abs(i.toLat - c.lat) + Math.abs(i.toLon - c.lon) < 0.3) continue; // same spot — nothing to draw
          const verified = i.status === "observed" || i.status === "confirmed";
          const colour = SEV_HEX[i.severity];
          const line = lf.polyline(curve([c.lat, c.lon], [i.toLat, i.toLon]), {
            color: colour,
            weight: verified ? 2.5 : 1.5,
            opacity: verified ? 0.9 : 0.55,
            dashArray: verified ? undefined : "6 6",
            className: verified ? "intel-flow" : undefined,
          });
          line.bindPopup(
            `<div class="intel-pop"><b style="color:${colour}">KNOCK-ON · ${i.status.toUpperCase()}</b> · ${Math.round(i.confidence * 100)}% · ${esc(i.horizon)}<br/>` +
              `<span class="t">${esc(i.effect)}</span><br/>` +
              `<span class="m">${esc(c.event)} in ${esc(COUNTRY_BY_CODE[c.from].name)} → ${esc(i.targetAgent)} (${esc(DOMAIN_LABEL[i.domain])}). ${esc(i.mechanism)}.</span></div>`,
            { maxWidth: 340 },
          );
          line.bindTooltip(esc(i.effect.slice(0, 80)), { sticky: true, opacity: 0.9 });
          line.addTo(arcs);
          lf.circleMarker([i.toLat, i.toLon], {
            radius: 4,
            color: colour,
            weight: 2,
            fillColor: "#070b12",
            fillOpacity: 1,
          }).addTo(arcs);
        }
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
  }, [ready, signals, alerts, chains, show]);

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
            ["arcs", "Knock-on arcs"],
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
          {located}/{signals.length} pinned to a place · dashed marker = approximate · dashed arc = projected, solid = verified
        </div>
      </div>
    </div>
  );
}
