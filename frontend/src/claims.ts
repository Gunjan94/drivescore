// Claims history — the insurer's system-of-record view.
//
// The pitch hook: claims VALIDATE the DriveScore. A risky driver's low score is
// confirmed by real at-fault claims (proving the static table underpriced a
// loss-maker); a safe driver's high score is confirmed by a claim-free record
// (proving they're overcharged). Each at-fault claim cites the telematics factor
// behind it, so "the AI saw the risk, the claims confirm it" lands literally.
//
// Hero personas are hand-authored to nail the narrative; the rest of the book is
// derived deterministically from the driver's DriveScore so the Underwriter
// Console stays consistent when inspecting any policy.

export interface Claim {
  id: string;
  date: string; // "14 Mar 2024"
  type: string; // "Rear-end collision"
  atFault: boolean;
  amount: number; // SGD incurred
  status: "Settled" | "In review";
  cause?: string; // links to a telematics factor, e.g. "hard braking"
}

export interface ClaimsRecord {
  claims: Claim[];
  claimFreeYears: number;
  atFaultCount: number;
  totalIncurred: number;
  /** Pitch verdict: does the claims record agree with the DriveScore? */
  validation: {
    kind: "risk_confirmed" | "low_risk_confirmed" | "mixed";
    headline: string;
    detail: string;
  };
}

// ---------------------------------------------------------------------------
// Hand-authored hero claims (the three personas the demo narrates)
// ---------------------------------------------------------------------------
const HERO: Record<string, Claim[]> = {
  // Sarah — safe driver, claim-free. Overcharged despite zero losses.
  D0001: [],
  // Marcus — risky driver. Two at-fault claims that match his worst factors:
  // hard braking + harsh cornering. The losses the static book is absorbing.
  D0002: [
    {
      id: "CLM-2024-08831",
      date: "09 Nov 2024",
      type: "Rear-end collision",
      atFault: true,
      amount: 8400,
      status: "Settled",
      cause: "hard braking",
    },
    {
      id: "CLM-2023-05127",
      date: "22 Jul 2023",
      type: "Intersection collision",
      atFault: true,
      amount: 6200,
      status: "Settled",
      cause: "harsh cornering",
    },
  ],
  // Priya — average driver. One minor, not-at-fault claim; otherwise clean.
  D0003: [
    {
      id: "CLM-2023-04420",
      date: "03 Feb 2023",
      type: "Windscreen",
      atFault: false,
      amount: 650,
      status: "Settled",
    },
  ],
};

const HERO_CLAIM_FREE: Record<string, number> = { D0001: 5, D0002: 0, D0003: 2 };

// ---------------------------------------------------------------------------
// Deterministic derivation for the rest of the book
// ---------------------------------------------------------------------------
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const COLLISION_TYPES = [
  ["Rear-end collision", "hard braking"],
  ["Intersection collision", "harsh cornering"],
  ["Single-vehicle, night", "night driving"],
  ["Lane-change collision", "average speed"],
];

function derived(id: string, drivescore: number): { claims: Claim[]; claimFreeYears: number } {
  const h = hash(id + "clm");
  const risk = (100 - drivescore) / 100; // 0 (safe) .. 1 (risky)
  // Expected at-fault claims over a 3-yr window scales with risk.
  const expected = risk * 2.4;
  const nClaims = Math.max(0, Math.round(expected - 0.5 + ((h % 100) / 100) * 0.8));

  const claims: Claim[] = [];
  for (let i = 0; i < Math.min(nClaims, 3); i++) {
    const [type, cause] = COLLISION_TYPES[(h >> (i * 3)) % COLLISION_TYPES.length];
    const atFault = ((h >> (i + 1)) & 1) === 0 || risk > 0.5; // risky → more at-fault
    const amount = 2500 + ((h >> (i * 2)) % 90) * 100; // S$2.5k–11.5k
    const yr = 2025 - i;
    const mon = ((h >> (i * 4)) % 12) + 1;
    const day = ((h >> (i * 5)) % 27) + 1;
    claims.push({
      id: `CLM-${yr}-${String((h >> i) % 90000 + 10000)}`,
      date: `${String(day).padStart(2, "0")} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][mon - 1]} ${yr}`,
      type,
      atFault,
      amount,
      status: i === 0 && risk > 0.6 && (h & 7) === 0 ? "In review" : "Settled",
      cause: atFault ? cause : undefined,
    });
  }
  const claimFreeYears = claims.length === 0 ? Math.min(5, 1 + (h % 5)) : 0;
  return { claims, claimFreeYears };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function claimsFor(id: string, drivescore: number): ClaimsRecord {
  const heroClaims = HERO[id];
  const { claims, claimFreeYears } =
    heroClaims !== undefined
      ? { claims: heroClaims, claimFreeYears: HERO_CLAIM_FREE[id] ?? 0 }
      : derived(id, drivescore);

  const atFaultCount = claims.filter((c) => c.atFault).length;
  const totalIncurred = claims.reduce((s, c) => s + c.amount, 0);

  // Validation verdict — the pitch line tying claims back to the score.
  let validation: ClaimsRecord["validation"];
  if (atFaultCount > 0 && drivescore < 60) {
    validation = {
      kind: "risk_confirmed",
      headline: "Risk confirmed by claims",
      detail:
        "DriveScore flagged elevated risk from driving behaviour — and the claims record bears it out. Static pricing missed this.",
    };
  } else if (claims.length === 0 && drivescore >= 80) {
    validation = {
      kind: "low_risk_confirmed",
      headline: "Low risk confirmed",
      detail:
        "A high DriveScore and a clean claims record agree: a genuinely low-risk driver — currently overcharged by the static table.",
    };
  } else {
    validation = {
      kind: "mixed",
      headline: "Consistent with DriveScore",
      detail: "Claims experience is in line with this driver's behaviour-based risk.",
    };
  }

  return { claims, claimFreeYears, atFaultCount, totalIncurred, validation };
}
