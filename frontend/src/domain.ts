// Presentational insurance layer — Singapore motor market.
//
// The backend engine stays the source of truth for score / risk / premium math.
// This module derives the policy "chrome" a real SG motor insurer shows around
// those numbers — policy no., vehicle, No Claims Discount (NCD), excess, cover
// dates — and formats money in SGD annual terms (SG motor is priced annually,
// with a monthly equivalent shown for convenience).
//
// Everything here is deterministic from the driver id so a given policy always
// renders identically (no random churn between renders).

import type { DriverMeta, DriverRow, PriceResult, Telematics } from "./api";

export const INSURER = "Etiqa"; // insurer name used in policy chrome (illustrative; synthetic data)
export const PRODUCT = "DriveScore Telematics Motor";

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------
export function sgd(amount: number, decimals = 0): string {
  return (
    "S$" +
    amount.toLocaleString("en-SG", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/** SG motor premiums are annual. Engine returns a monthly figure. */
export const annual = (monthly: number) => monthly * 12;

// ---------------------------------------------------------------------------
// Deterministic helpers (stable per driver id)
// ---------------------------------------------------------------------------
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pick = <T,>(arr: T[], seed: number): T => arr[seed % arr.length];

// ---------------------------------------------------------------------------
// No Claims Discount (Singapore scale: 0/10/20/30/40/50%)
// NCD is claims-history based — independent of telematics. That's the point of
// the narrative: a loyal, claim-free customer can still be mispriced because the
// legacy table ignores *how they drive*. DriveScore is the live layer on top.
// ---------------------------------------------------------------------------
const NCD_OVERRIDE: Record<string, number> = {
  D0001: 50, // Sarah — loyal, claim-free, yet overcharged by the static table
  D0002: 10, // Marcus — thinner history, the underpriced-risky archetype
};

export function ncdPct(id: string): number {
  if (id in NCD_OVERRIDE) return NCD_OVERRIDE[id];
  // Bias toward the middle of the scale for the rest of the book.
  const t = [10, 20, 20, 30, 30, 40, 40, 50][hash(id + "ncd") % 8];
  return t ?? 20;
}

// ---------------------------------------------------------------------------
// Vehicle (make/model + SG plate) derived from class + id
// ---------------------------------------------------------------------------
const MODELS: Record<string, string[]> = {
  sedan: ["Toyota Corolla Altis", "Honda Civic", "Mazda 3", "Hyundai Avante"],
  suv: ["Honda CR-V", "Toyota RAV4", "Mazda CX-5", "Nissan Qashqai"],
  hatch: ["Volkswagen Golf", "Toyota Yaris", "Honda Jazz", "MINI Cooper"],
};

export function vehicleModel(id: string, vehicleClass: string): string {
  const list = MODELS[vehicleClass] ?? MODELS.sedan;
  return pick(list, hash(id + "veh"));
}

const PLATE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // SG plates skip I/O

export function plate(id: string): string {
  const h = hash(id + "plate");
  const l1 = PLATE_LETTERS[h % 24];
  const l2 = PLATE_LETTERS[(h >> 5) % 24];
  const num = (h % 9000) + 1000; // 1000–9999
  const chk = PLATE_LETTERS[(h >> 11) % 24];
  return `S${l1}${l2}${num}${chk}`;
}

// ---------------------------------------------------------------------------
// Policy chrome
// ---------------------------------------------------------------------------
export interface Policy {
  number: string;
  cover: string;
  status: string;
  vehicle: string;
  plate: string;
  ncd: number;
  excess: number;
  youngDriverExcess: number;
  effective: string;
  renewal: string;
  monitoringDays: number;
}

export function policyFor(meta: { id: string; age: number; vehicle_class: string }): Policy {
  const num = meta.id.replace(/\D/g, "").padStart(4, "0");
  // SG convention: an additional young-driver excess applies under age 25.
  const youngDriverExcess = meta.age < 25 ? 1500 : 0;
  return {
    number: `MTR-2026-${num}`,
    cover: "Comprehensive",
    status: "Active",
    vehicle: vehicleModel(meta.id, meta.vehicle_class),
    plate: plate(meta.id),
    ncd: ncdPct(meta.id),
    excess: 500,
    youngDriverExcess,
    effective: "15 Jan 2026",
    renewal: "14 Jan 2027",
    monitoringDays: 90,
  };
}

// ---------------------------------------------------------------------------
// Annualised, NCD-aware premium view derived from an engine PriceResult.
//
// Comparison (standard table vs DriveScore) is shown *before* NCD so the
// engine's exact saving delta is preserved; NCD is then applied to the chosen
// DriveScore premium to produce the annual amount payable — exactly how a real
// motor quote is built up.
// ---------------------------------------------------------------------------
export interface PremiumView {
  ncd: number;
  baseAnnual: number; // segment base rate, annualised (pre-behaviour)
  behaviourAdj: number; // signed: +surcharge / −discount applied by DriveScore
  driveScoreAnnual: number; // behaviour-adjusted, pre-NCD
  standardAnnual: number; // legacy static-table premium, pre-NCD
  savingAnnual: number; // standard − driveScore (positive = customer saves)
  ncdAmount: number; // NCD applied to the DriveScore premium
  payableAnnual: number; // final annual premium payable
  payableMonthly: number;
}

export function premiumView(price: PriceResult, ncd: number): PremiumView {
  const baseAnnual = annual(price.base_rate);
  const driveScoreAnnual = annual(price.dynamic_premium);
  const standardAnnual = annual(price.static_premium);
  const behaviourAdj = driveScoreAnnual - baseAnnual; // +/−
  const savingAnnual = standardAnnual - driveScoreAnnual; // +ve = saving
  const ncdAmount = (ncd / 100) * driveScoreAnnual;
  const payableAnnual = driveScoreAnnual - ncdAmount;
  return {
    ncd,
    baseAnnual,
    behaviourAdj,
    driveScoreAnnual,
    standardAnnual,
    savingAnnual,
    ncdAmount,
    payableAnnual,
    payableMonthly: payableAnnual / 12,
  };
}

// ---------------------------------------------------------------------------
// DriveScore program tiers (consumer-facing band names)
// ---------------------------------------------------------------------------
export interface Tier {
  label: string;
  blurb: string;
}

export function tierFor(band: string): Tier {
  switch (band) {
    case "safe":
      return { label: "Platinum driver", blurb: "Top safe-driving tier — best available pricing" };
    case "moderate":
      return { label: "Silver driver", blurb: "Solid driving — room to reach Platinum" };
    default:
      return { label: "Needs coaching", blurb: "Elevated risk — coaching can lower the premium" };
  }
}

// Re-export for convenience where views import a single module.
export type { DriverMeta, DriverRow, PriceResult, Telematics };
