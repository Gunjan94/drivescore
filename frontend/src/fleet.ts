// Fleet B2B reframe — operator + insurer framing and shared derivations.
//
// DriveScore is sold to a FLEET OPERATOR (last-mile logistics) and the INSURER
// that underwrites their commercial motor cover. The operator here is
// "Ninja Logistics" (Ninja Van's parent/holding entity) and the insurer is
// "Etiqa" — named illustratively for the demo. ALL data is synthetic: no real
// Ninja Van or Etiqa data is used.

import type { DriverRow, FleetSummary, TripEventType } from "./api";

export const OPERATOR = "Ninja Logistics";
export const OPERATOR_TYPE = "Southeast Asia last-mile logistics fleet";
export const INSURER = "Etiqa";
export const PRODUCT = "DriveScore Fleet Risk & Insurance";

// Two stakeholder audiences the demo addresses.
export const AUDIENCE = {
  fleet: { label: "Fleet operator", who: `${OPERATOR} · CEO view` },
  insurer: { label: "Insurer", who: `${INSURER} · underwriting owner` },
} as const;

// Event marker styling for the map + legends.
export const EVENT_META: Record<TripEventType, { label: string; color: string }> = {
  hard_brake: { label: "Hard brake", color: "#F87171" },
  harsh_corner: { label: "Harsh corner", color: "#FB923C" },
  speeding: { label: "Speeding", color: "#FBBF24" },
  night: { label: "Night driving", color: "#818CF8" },
};

/** Fleet vehicle-type label for the engine's segment classes. */
export function vehicleType(cls: string): string {
  switch (cls) {
    case "sedan":
      return "Cargo van";
    case "suv":
      return "Box truck";
    case "hatch":
      return "Compact van";
    default:
      return cls.toUpperCase();
  }
}

export interface LeaderboardRow extends DriverRow {
  rank: number;
}

export type Quadrant = "overcharged_safe" | "underpriced_risky" | "fair";

/** Classify a vehicle into a pricing quadrant — same thresholds as the backend
 *  engine.quadrant(), so counts match the fleet summary exactly. */
export function quadrantOf(d: DriverRow): Quadrant {
  if (d.drivescore >= 75 && d.delta <= -8) return "overcharged_safe";
  if (d.drivescore < 60 && d.delta >= 8) return "underpriced_risky";
  return "fair";
}

/** Sort the fleet best→worst (or worst→best) by DriveScore. */
export function leaderboard(drivers: DriverRow[], order: "best" | "worst" = "worst"): LeaderboardRow[] {
  const sorted = [...drivers].sort((a, b) =>
    order === "worst" ? a.drivescore - b.drivescore : b.drivescore - a.drivescore,
  );
  return sorted.map((d, i) => ({ ...d, rank: i + 1 }));
}

/** Convenience: derive band split percentages for a donut/segmented bar. */
export function bandSplit(fs: FleetSummary) {
  const total = Math.max(1, fs.total_vehicles);
  return {
    safe: { n: fs.safe, pct: (100 * fs.safe) / total },
    moderate: { n: fs.moderate, pct: (100 * fs.moderate) / total },
    high: { n: fs.high_risk, pct: (100 * fs.high_risk) / total },
  };
}
