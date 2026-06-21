// Synthetic recent-trip feed for the Driver Dashboard.
//
// Real telematics apps (Progressive Snapshot, Discovery Vitality Drive, etc.)
// show a scrollable trip history: each trip has a date, route, distance, a
// per-trip score, and flagged events (hard brake, speeding, night driving).
// We derive a deterministic feed from the driver's own telematics so the feed
// is *consistent* with the headline DriveScore — a high-night-driving profile
// produces night trips with night-driving flags, etc. Nothing is random.

import type { Telematics } from "./api";

export interface TripEvent {
  type: "hard_brake" | "harsh_corner" | "speeding" | "night";
  label: string;
}

export interface Trip {
  id: string;
  day: string; // e.g. "Mon"
  date: string; // e.g. "10 Jun"
  time: string; // departure
  from: string;
  to: string;
  km: number;
  score: number;
  events: TripEvent[];
  night: boolean;
}

const SG_PLACES = [
  "Home (Tampines)",
  "Office (Raffles Place)",
  "Orchard Rd",
  "Changi Airport",
  "Jurong East",
  "Woodlands",
  "Marina Bay",
  "Bishan",
  "Sentosa",
  "VivoCity",
];

function seeded(seed: number): () => number {
  // Mulberry32 — deterministic PRNG so the feed is stable per driver.
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DATES = ["13 Jun", "12 Jun", "11 Jun", "10 Jun", "9 Jun", "8 Jun", "7 Jun", "6 Jun"];

/**
 * Build a recent-trip feed whose event density tracks the telematics profile.
 * Higher night_pct → more night trips & night flags; higher hard-brake rate →
 * more hard-brake events; etc. Per-trip score is anti-correlated with events.
 */
export function recentTrips(tel: Telematics, seed: number, count = 6): Trip[] {
  const rnd = seeded(seed);
  const trips: Trip[] = [];
  for (let i = 0; i < count; i++) {
    const km = Math.round(8 + rnd() * 32);
    const night = rnd() < tel.night_pct;
    const events: TripEvent[] = [];

    // Event probabilities scale with the driver's rates (per-100km → per-trip).
    if (rnd() < (tel.hard_brakes_per_100km / 100) * km * 0.9)
      events.push({ type: "hard_brake", label: "Hard brake" });
    if (rnd() < (tel.harsh_corners_per_100km / 100) * km * 0.9)
      events.push({ type: "harsh_corner", label: "Harsh corner" });
    if (tel.avg_speed_kmh > 95 && rnd() < 0.5)
      events.push({ type: "speeding", label: "Speeding" });
    if (night) events.push({ type: "night", label: "Night driving" });

    // Per-trip score: starts high, each event and night trip shaves points.
    const score = Math.max(
      52,
      Math.min(99, 96 - events.length * 9 - (night ? 4 : 0) - Math.round(rnd() * 4)),
    );

    const fromIdx = Math.floor(rnd() * SG_PLACES.length);
    let toIdx = Math.floor(rnd() * SG_PLACES.length);
    if (toIdx === fromIdx) toIdx = (toIdx + 1) % SG_PLACES.length;

    const hour = night ? 22 + Math.floor(rnd() * 4) : 7 + Math.floor(rnd() * 12);
    const mins = Math.floor(rnd() * 60);
    const time = `${String(hour % 24).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

    trips.push({
      id: `T${i}`,
      day: DAYS[i % DAYS.length],
      date: DATES[i % DATES.length],
      time,
      from: SG_PLACES[fromIdx],
      to: SG_PLACES[toIdx],
      km,
      score,
      events,
      night,
    });
  }
  return trips;
}
