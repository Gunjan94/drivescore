// FleetMap — the live map of where & how the fleet drives.
//
// Renders each trip as a real GPS polyline (from the backend geo engine),
// coloured by the trip's safety score, with safety events (hard brake, harsh
// corner, speeding, night) plotted as markers along the route. Clicking a route
// drills into that driver. Used both for the whole-fleet view and a single
// driver's recent trips.
//
// Tiles are keyless CartoDB basemaps (no API token) — consistent with the
// no-credentials ethos of the prototype. We deliberately use CircleMarker /
// Polyline (vector layers) rather than Leaflet's default icon markers to avoid
// the well-known marker-image bundling issue under Vite.
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Trip, FleetBase } from "../api";
import { EVENT_META } from "../fleet";
import { getMode, scoreColor, theme } from "../theme";

const TILES: Record<string, { url: string; attribution: string }> = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  },
};

/** Keeps Leaflet's internal size in sync when the container box changes
 *  (responsive breakpoints, tab switches). */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    // One deferred invalidate after mount covers the initial layout pass.
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [map]);
  return null;
}

export interface FleetMapProps {
  trips: Trip[];
  center: [number, number];
  zoom?: number;
  /** Wrapper height classes — Leaflet needs an explicit container height. */
  className?: string;
  onSelectDriver?: (driverId: string) => void;
  selectedDriverId?: string;
  /** Show a small origin dot at the start of each route. */
  showOrigins?: boolean;
  /** Fleet depots (bases) to mark distinctly. */
  bases?: FleetBase[];
}

export function FleetMap({
  trips,
  center,
  zoom = 12,
  className = "h-[360px] sm:h-[460px] lg:h-[560px]",
  onSelectDriver,
  selectedDriverId,
  showOrigins = true,
  bases = [],
}: FleetMapProps) {
  const mode = getMode(); // re-read on every render so tiles follow the theme
  const tile = TILES[mode] ?? TILES.light;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl ${className}`}
      style={{ border: `1px solid ${theme.color.line}` }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: theme.color.panel2 }}
        attributionControl
      >
        <TileLayer key={mode} url={tile.url} attribution={tile.attribution} />
        <MapResizer />

        {trips.map((t) => {
          const dim = selectedDriverId && t.driver_id !== selectedDriverId;
          const color = scoreColor(t.score);
          return (
            <Polyline
              key={t.id}
              positions={t.route}
              pathOptions={{
                color,
                weight: dim ? 2 : 4,
                opacity: dim ? 0.25 : 0.85,
              }}
              eventHandlers={
                onSelectDriver ? { click: () => onSelectDriver(t.driver_id) } : undefined
              }
            >
              <Tooltip sticky>
                <div style={{ fontWeight: 700 }}>{t.driver_name}</div>
                <div>
                  {t.from_} → {t.to} · {t.km} km
                </div>
                <div>
                  Trip score {t.score}
                  {t.night ? " · night" : ""}
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Origin dots */}
        {showOrigins &&
          trips.map((t) => {
            if (selectedDriverId && t.driver_id !== selectedDriverId) return null;
            const [lat, lng] = t.route[0] ?? center;
            return (
              <CircleMarker
                key={`o-${t.id}`}
                center={[lat, lng]}
                radius={3}
                pathOptions={{ color: theme.color.muted, fillColor: theme.color.muted, fillOpacity: 0.9, weight: 1 }}
              />
            );
          })}

        {/* Safety event markers */}
        {trips.flatMap((t) => {
          if (selectedDriverId && t.driver_id !== selectedDriverId) return [];
          return t.events.map((e, i) => {
            const meta = EVENT_META[e.type];
            return (
              <CircleMarker
                key={`${t.id}-e${i}`}
                center={[e.lat, e.lng]}
                radius={5}
                pathOptions={{ color: meta.color, fillColor: meta.color, fillOpacity: 0.9, weight: 1.5 }}
              >
                <Tooltip>
                  <div style={{ fontWeight: 700 }}>{meta.label}</div>
                  <div>
                    {t.driver_name} · {t.time}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          });
        })}

        {/* Driver home bases — distinct ringed markers */}
        {bases.map((b) => (
          <CircleMarker
            key={`base-${b.name}-${b.lat}-${b.lng}`}
            center={[b.lat, b.lng]}
            radius={7}
            pathOptions={{
              color: theme.color.accent2,
              fillColor: theme.color.accent,
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <div style={{ fontWeight: 700 }}>🏠 {b.name}</div>
              <div>Driver's home — vehicle parked here; shifts start &amp; end here</div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

/** Compact legend for the event marker colours + the score gradient. */
export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <span className="flex items-center gap-1.5 text-muted">
        <span className="inline-block w-4 h-1 rounded" style={{ background: theme.color.good }} />
        safer route
      </span>
      <span className="flex items-center gap-1.5 text-muted">
        <span className="inline-block w-4 h-1 rounded" style={{ background: theme.color.bad }} />
        riskier route
      </span>
      {(["hard_brake", "harsh_corner", "speeding", "night"] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5 text-muted">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: EVENT_META[k].color }} />
          {EVENT_META[k].label}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-muted">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ background: theme.color.accent, border: `2px solid ${theme.color.accent2}` }}
        />
        Driver home base
      </span>
    </div>
  );
}
