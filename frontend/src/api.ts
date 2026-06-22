// Fetch wrappers + SSE stream reader for /explain.
// All calls go through the Vite proxy at /api -> backend :8000.

export interface Telematics {
  avg_speed_kmh: number;
  hard_brakes_per_100km: number;
  night_pct: number;
  monthly_km: number;
  harsh_corners_per_100km: number;
}

export interface DriverMeta {
  age: number;
  postcode: string;
  vehicle_class: string;
}

export interface Factor {
  name: string;
  key: string;
  contribution: number;
  value: number;
  risk: number;
  weight: number;
}

export interface ScoreResult {
  drivescore: number;
  risk: number;
  factors: Factor[];
  band: string;
}

export interface PriceResult {
  drivescore: number;
  band: string;
  factors: Factor[];
  dynamic_premium: number;
  static_premium: number;
  delta: number;
  multiplier: number;
  base_rate: number;
}

export interface DriverRow {
  id: string;
  name: string;
  age: number;
  postcode: string;
  vehicle_class: string;
  drivescore: number;
  band: string;
  static_premium: number;
  dynamic_premium: number;
  delta: number;
  multiplier: number;
  telematics: Telematics;
}

export interface PortfolioSummary {
  total_drivers: number;
  overcharged_safe: number;
  underpriced_risky: number;
  fair: number;
  projected_retention_gain_pct: number;
  projected_annual_loss_reduction: number;
  loss_ratio_before: number;
  loss_ratio_after: number;
}

export interface Portfolio {
  drivers: DriverRow[];
  summary: PortfolioSummary;
}

// In dev, Vite proxies /api -> backend (see vite.config.ts). In production the
// build is given the Lambda Function URL via VITE_API_BASE.
const API = (((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE) as string | undefined) || "/api";

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export const getScore = (telematics: Telematics) =>
  postJSON<ScoreResult>("/score", { telematics });

export const getPrice = (telematics: Telematics, driver_meta: DriverMeta) =>
  postJSON<PriceResult>("/price", { telematics, driver_meta });

export async function getPortfolio(): Promise<Portfolio> {
  const res = await fetch(`${API}/portfolio`);
  if (!res.ok) throw new Error(`/portfolio ${res.status}`);
  return res.json();
}

export async function getDriver(id: string): Promise<DriverRow> {
  const res = await fetch(`${API}/driver/${id}`);
  if (!res.ok) throw new Error(`/driver ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Fleet + trip-map data (B2B fleet reframe)
// ---------------------------------------------------------------------------
export type TripEventType = "hard_brake" | "harsh_corner" | "speeding" | "night";

export interface TripEvent {
  type: TripEventType;
  label: string;
  lat: number;
  lng: number;
}

export interface Trip {
  id: string;
  driver_id: string;
  driver_name: string;
  day: string;
  date: string;
  time: string;
  from_: string;
  to: string;
  km: number;
  score: number;
  night: boolean;
  route: [number, number][];
  events: TripEvent[];
}

export interface FleetSummary {
  operator: string;
  insurer: string;
  total_vehicles: number;
  active_drivers: number;
  avg_score: number;
  safe: number;
  moderate: number;
  high_risk: number;
  at_risk: number;
  annual_premium: number;
  annual_premium_static: number;
  annual_premium_coached: number;
  coaching_savings: number;
  vs_static_savings: number;
}

export interface FleetBase {
  name: string;
  lat: number;
  lng: number;
}

export interface FleetTrips {
  trips: Trip[];
  center: [number, number];
  count: number;
  bases?: FleetBase[];
}

export async function getFleetSummary(): Promise<FleetSummary> {
  const res = await fetch(`${API}/fleet/summary`);
  if (!res.ok) throw new Error(`/fleet/summary ${res.status}`);
  return res.json();
}

export async function getFleetTrips(limit = 52): Promise<FleetTrips> {
  const res = await fetch(`${API}/fleet/trips?limit=${limit}`);
  if (!res.ok) throw new Error(`/fleet/trips ${res.status}`);
  return res.json();
}

export async function getDriverTrips(id: string, count = 6): Promise<FleetTrips> {
  const res = await fetch(`${API}/driver/${id}/trips?count=${count}`);
  if (!res.ok) throw new Error(`/driver/${id}/trips ${res.status}`);
  return res.json();
}

export interface ExplainPayload {
  drivescore: number;
  factors: Factor[];
  delta?: number;
  context: "driver_dashboard" | "price_change";
  changed_factor?: string | null;
}

/**
 * Stream the /explain SSE response, invoking onToken for each text chunk.
 * Returns a cancel() function. Resolves the promise when the stream ends.
 */
export function streamExplain(
  payload: ExplainPayload,
  onToken: (full: string) => void,
  onDone?: () => void,
): () => void {
  const controller = new AbortController();
  (async () => {
    let acc = "";
    try {
      const res = await fetch(`${API}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.body) throw new Error("no stream body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            onDone?.();
            return;
          }
          try {
            const { text } = JSON.parse(data);
            acc += text;
            onToken(acc);
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
      onDone?.();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onToken(acc || "Explanation unavailable right now.");
        onDone?.();
      }
    }
  })();
  return () => controller.abort();
}
