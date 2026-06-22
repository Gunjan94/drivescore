"""DriveScore risk-scoring + pricing engine — the source of truth.

Every number the app shows comes from here. Pure functions, no I/O, fully
deterministic. Scoring and pricing formulas are specified in BUILDER.md and
implemented verbatim below.
"""
from __future__ import annotations

from typing import TypedDict


# ---------------------------------------------------------------------------
# Factor definitions: linear normalization breakpoints + weights (BUILDER.md)
# ---------------------------------------------------------------------------
# Each factor maps a raw telematics value to a 0..1 risk component via linear
# interpolation between a "safe" breakpoint (risk 0) and a "risky" breakpoint
# (risk 1), clamped to [0, 1]. Weights sum to 1.0; night-driving is heaviest so
# the hero slider (night %) dominates the score.
FACTORS = [
    # (display name, telematics key, safe, risky, weight)
    ("Night driving",   "night_pct",              0.05,  0.45, 0.30),
    ("Hard braking",    "hard_brakes_per_100km",  1.0,   9.0,  0.25),
    ("Average speed",   "avg_speed_kmh",          60.0,  115.0, 0.20),
    ("Harsh cornering", "harsh_corners_per_100km", 0.5,   6.0,  0.15),
    ("Monthly mileage", "monthly_km",             400.0, 2500.0, 0.10),
]

# Insurer flat base rate per vehicle segment (the "base_rate" in /price).
SEGMENT_BASE = {
    "sedan": 104.80,
    "suv": 121.00,
    "hatch": 92.50,
}

# Legacy static-table premium. Deliberately behavior-blind: it only looks at
# age band, postcode band and vehicle class. Tuned so the safe cohort lands
# ABOVE their dynamic price (overcharged) and the risky cohort BELOW it
# (underpriced) — exactly the two failure modes the console surfaces.
# Keyed by (age_band, postcode_band, vehicle_class).
_STATIC_TABLE = {
    # age_band: "young" (<25), "mid" (25-59), "senior" (60+)
    # postcode_band: "metro" (starts 1/2), "regional" (else)
    ("young", "metro", "sedan"): 168.0,
    ("young", "metro", "suv"): 188.0,
    ("young", "metro", "hatch"): 150.0,
    ("young", "regional", "sedan"): 150.0,
    ("young", "regional", "suv"): 170.0,
    ("young", "regional", "hatch"): 134.0,
    ("mid", "metro", "sedan"): 103.0,
    ("mid", "metro", "suv"): 148.0,
    ("mid", "metro", "hatch"): 118.0,
    ("mid", "regional", "sedan"): 118.0,
    ("mid", "regional", "suv"): 133.0,
    ("mid", "regional", "hatch"): 106.0,
    ("senior", "metro", "sedan"): 122.0,
    ("senior", "metro", "suv"): 138.0,
    ("senior", "metro", "hatch"): 110.0,
    ("senior", "regional", "sedan"): 110.0,
    ("senior", "regional", "suv"): 124.0,
    ("senior", "regional", "hatch"): 99.0,
}

PRICING_K = 1.6           # multiplier slope
MULT_MIN, MULT_MAX = 0.65, 1.8


class Factor(TypedDict):
    name: str
    key: str
    contribution: int   # points of DriveScore this behavior cost (0..100)
    value: float        # raw telematics value
    risk: float         # this factor's normalized risk 0..1
    weight: float


def norm(value: float, safe: float, risky: float) -> float:
    """Linear-normalize a raw value into [0, 1] risk, clamped."""
    if risky == safe:
        return 0.0
    return min(1.0, max(0.0, (value - safe) / (risky - safe)))


def compute_risk(telematics: dict) -> float:
    """Weighted sum of per-factor normalized risk -> overall risk in [0, 1]."""
    risk = 0.0
    for _name, key, safe, risky, weight in FACTORS:
        v = float(telematics.get(key, safe))
        risk += weight * norm(v, safe, risky)
    return min(1.0, max(0.0, risk))


def band_for(drivescore: int) -> str:
    if drivescore >= 80:
        return "safe"
    if drivescore >= 60:
        return "moderate"
    return "high-risk"


def score(telematics: dict) -> dict:
    """Compute DriveScore (0..100) + per-factor contributions.

    contribution_i = round(100 * weight_i * norm_i) — the points of DriveScore
    each behavior cost, sorted descending. Returned to power the top-3 bars and
    to ground the AI explanation in real numbers.
    """
    factors: list[Factor] = []
    risk = 0.0
    for name, key, safe, risky, weight in FACTORS:
        v = float(telematics.get(key, safe))
        n = norm(v, safe, risky)
        risk += weight * n
        factors.append(
            {
                "name": name,
                "key": key,
                "contribution": round(100 * weight * n),
                "value": v,
                "risk": round(n, 4),
                "weight": weight,
            }
        )
    risk = min(1.0, max(0.0, risk))
    drivescore = round(100 * (1 - risk))
    factors.sort(key=lambda f: f["contribution"], reverse=True)
    return {
        "drivescore": drivescore,
        "risk": round(risk, 4),
        "factors": factors,
        "band": band_for(drivescore),
    }


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------
def _age_band(age: int) -> str:
    if age < 25:
        return "young"
    if age < 60:
        return "mid"
    return "senior"


def _postcode_band(postcode: str) -> str:
    pc = str(postcode).strip()
    return "metro" if pc[:1] in ("1", "2") else "regional"


def static_premium(driver_meta: dict) -> float:
    """Legacy flat-table premium lookup (behavior-blind baseline)."""
    age = int(driver_meta.get("age", 40))
    postcode = driver_meta.get("postcode", "3000")
    vehicle = driver_meta.get("vehicle_class", "sedan")
    key = (_age_band(age), _postcode_band(postcode), vehicle)
    # Fall back to a sedan/mid/metro-ish default if a key is missing.
    return _STATIC_TABLE.get(key, _STATIC_TABLE[("mid", "metro", "sedan")])


def price(telematics: dict, driver_meta: dict) -> dict:
    """Dynamic premium = base_rate x risk multiplier, plus delta vs static.

    multiplier = clamp(1 + k*(risk - 0.5), 0.6, 1.8)
      -> safe drivers (<0.5 risk) get a discount, risky (>0.5) a surcharge.
    delta = dynamic - static  (negative = the customer saves).
    """
    s = score(telematics)
    risk = s["risk"]
    vehicle = driver_meta.get("vehicle_class", "sedan")
    base_rate = SEGMENT_BASE.get(vehicle, SEGMENT_BASE["sedan"])
    multiplier = max(MULT_MIN, min(MULT_MAX, 1 + PRICING_K * (risk - 0.5)))
    dynamic_premium = round(base_rate * multiplier, 2)
    static = round(static_premium(driver_meta), 2)
    delta = round(dynamic_premium - static, 2)
    return {
        "drivescore": s["drivescore"],
        "band": s["band"],
        "factors": s["factors"],
        "dynamic_premium": dynamic_premium,
        "static_premium": static,
        "delta": delta,
        "multiplier": round(multiplier, 4),
        "base_rate": round(base_rate, 2),
    }


# ---------------------------------------------------------------------------
# Portfolio: quadrant assignment + book-level repricing impact
# ---------------------------------------------------------------------------
def quadrant(drivescore: int, delta: float) -> str:
    """Assign a driver to one of the two failure modes (or 'fair').

    overcharged_safe : safe driver (high score) paying ABOVE dynamic (delta<0)
    underpriced_risky: risky driver (low score) paying BELOW dynamic (delta>0)
    """
    if drivescore >= 75 and delta <= -8:
        return "overcharged_safe"
    if drivescore < 60 and delta >= 8:
        return "underpriced_risky"
    return "fair"


def score_driver(driver: dict) -> dict:
    """Score + price one driver record, returning the console row shape."""
    p = price(driver["telematics"], driver)
    q = quadrant(p["drivescore"], p["delta"])
    return {
        "id": driver["id"],
        "name": driver["name"],
        "age": driver["age"],
        "postcode": driver["postcode"],
        "vehicle_class": driver["vehicle_class"],
        "drivescore": p["drivescore"],
        "band": p["band"],
        "static_premium": p["static_premium"],
        "dynamic_premium": p["dynamic_premium"],
        "delta": p["delta"],
        "multiplier": p["multiplier"],
        "telematics": driver["telematics"],
    }


# Loss-ratio model calibration.
#   Both pricing methods are filed to the SAME target loss ratio at t=0 — that's
#   how insurers set their overall rate level. The difference emerges over the
#   renewal cycle through ADVERSE SELECTION: under static pricing the
#   overcharged-safe drivers (high premium, low loss — the most profitable
#   policies) lapse, so the residual book's loss ratio drifts up. Behaviour-based
#   pricing retains them and holds the target.
#   * TARGET_LR: healthy motor target loss ratio (also the static book's t=0 LR).
#   * EL_FLOOR / EL_SLOPE: expected annual loss per driver scales with risk,
#     EL_i ∝ (FLOOR + SLOPE·risk_i) — even the safest driver carries some loss.
#   * CHURN: share of overcharged-safe drivers that lapse under static pricing.
TARGET_LR = 0.72
EL_FLOOR, EL_SLOPE = 0.35, 1.6
CHURN = 0.30  # annual lapse share of overcharged-safe drivers under static pricing


def _expected_losses(rows: list[dict]) -> list[float]:
    """Expected annual loss per driver, anchored so the full STATIC book == TARGET_LR.

    Deterministic and transparent: a driver's expected claims cost rises with
    their behavioural risk, and the whole scale is anchored so that the insurer's
    current (static) book sits exactly on its filed target loss ratio at t=0.
    Adverse selection is then what moves it.
    """
    risks = [compute_risk(r["telematics"]) for r in rows]
    raw = [EL_FLOOR + EL_SLOPE * rk for rk in risks]
    static_annual = sum(r["static_premium"] * 12 for r in rows)
    base = TARGET_LR * static_annual / max(1e-9, sum(raw))
    return [base * x for x in raw]


def loss_ratio_before_after(rows: list[dict]) -> tuple[float, float]:
    """Book loss ratio under the status quo vs. behaviour-based pricing.

    BEFORE = static pricing after adverse selection: a share of overcharged-safe
             drivers lapse; losing those low-loss / high-premium policies leaves a
             riskier residual book, lifting the loss ratio above the filed target.
    AFTER  = behaviour-based pricing retains the safe drivers, so the book holds
             the target loss ratio.
    The gap is the mispricing + adverse-selection cost the engine removes.
    """
    el = _expected_losses(rows)
    static_annual = [r["static_premium"] * 12 for r in rows]

    # AFTER: safe drivers retained, book sits on the filed target.
    lr_after = TARGET_LR

    # BEFORE: overcharged-safe drivers lapse → residual book is riskier.
    keep = [
        (1 - CHURN) if (r["delta"] <= -8 and r["drivescore"] >= 75) else 1.0
        for r in rows
    ]
    num = sum(w * e for w, e in zip(keep, el))
    den = sum(w * p for w, p in zip(keep, static_annual))
    lr_before = num / max(1e-9, den)
    return round(lr_before, 4), round(lr_after, 4)


def portfolio_summary(rows: list[dict]) -> dict:
    """Book-level repricing impact: counts + projected retention/loss effects.

    Business model (transparent + defensible on camera):
      * Overcharged-safe drivers are churn risk. Repricing them down recovers a
        slice of would-be churn -> projected retention gain.
      * Underpriced-risky drivers are loss-makers. The shortfall (static under
        dynamic) annualized across them is the loss we'd stop bleeding.
      * Loss ratio before/after captures the mispricing + adverse-selection
        cost removed by switching to behaviour-based pricing (see helpers).
    """
    overcharged = [r for r in rows if r["delta"] <= -8 and r["drivescore"] >= 75]
    underpriced = [r for r in rows if r["delta"] >= 8 and r["drivescore"] < 60]
    n = max(1, len(rows))

    # Projected retention gain: CHURN share of overcharged-safe drivers would
    # lapse under static pricing; fair repricing saves ~65% of those.
    would_churn = len(overcharged) * CHURN
    retained = would_churn * 0.65
    projected_retention_gain_pct = round(100 * retained / n, 1)

    # Annual loss reduction: sum of monthly underpricing shortfall x 12 across
    # the underpriced-risky cohort, scaled to a representative book of 50k
    # policies (synthetic 600-driver sample -> book multiplier).
    book_scale = 50000 / n
    monthly_shortfall = sum(r["delta"] for r in underpriced)  # positive = underpriced
    projected_annual_loss_reduction = round(monthly_shortfall * 12 * book_scale)

    lr_before, lr_after = loss_ratio_before_after(rows)

    return {
        "total_drivers": len(rows),
        "overcharged_safe": len(overcharged),
        "underpriced_risky": len(underpriced),
        "fair": len(rows) - len(overcharged) - len(underpriced),
        "projected_retention_gain_pct": projected_retention_gain_pct,
        "projected_annual_loss_reduction": projected_annual_loss_reduction,
        "loss_ratio_before": lr_before,
        "loss_ratio_after": lr_after,
    }


# ---------------------------------------------------------------------------
# Fleet view: the operator's own vehicles (the sample book IS the fleet).
# ---------------------------------------------------------------------------
def _coached_multiplier(risk: float) -> float:
    """Multiplier if a driver is coached down to the safe/moderate boundary.

    Drivers already at/below the 0.5 risk midpoint are unchanged; riskier drivers
    are modelled as reaching the midpoint (multiplier 1.0) after coaching. This is
    the upper bound on premium savings the CEO can unlock by improving the tail.
    """
    return max(MULT_MIN, min(MULT_MAX, 1 + PRICING_K * (min(risk, 0.5) - 0.5)))


def fleet_summary(rows: list[dict], drivers: list[dict]) -> dict:
    """Fleet-operator KPIs for the Fleet CEO command view.

    The fleet is the concrete set of vehicles in the book (not a modelled 50k
    portfolio — that framing belongs to the insurer). Every figure is summed
    straight from the engine's per-vehicle output, plus a coaching projection that
    re-prices the high-risk tail as if it reached a safe-driving baseline.
    """
    n = max(1, len(rows))
    by_id = {r["id"]: r for r in rows}

    avg_score = round(sum(r["drivescore"] for r in rows) / n)
    safe = sum(1 for r in rows if r["band"] == "safe")
    moderate = sum(1 for r in rows if r["band"] == "moderate")
    high_risk = sum(1 for r in rows if r["band"] == "high-risk")

    # Actual annualised premium for the fleet under behaviour-based pricing.
    annual_premium = round(sum(r["dynamic_premium"] * 12 for r in rows))
    # What the legacy static commercial-motor table would bill the same fleet.
    annual_premium_static = round(sum(r["static_premium"] * 12 for r in rows))

    # Coaching upside: re-price the high-risk tail at a coached baseline.
    coached_total = 0.0
    for d in drivers:
        r = by_id.get(d["id"])
        if r is None:
            continue
        if r["band"] == "high-risk":
            risk = compute_risk(d["telematics"])
            base = SEGMENT_BASE.get(d.get("vehicle_class", "sedan"), SEGMENT_BASE["sedan"])
            coached_total += base * _coached_multiplier(risk) * 12
        else:
            coached_total += r["dynamic_premium"] * 12
    annual_premium_coached = round(coached_total)
    coaching_savings = annual_premium - annual_premium_coached

    # Total safety events surfaced across recent trips (map + ops signal).
    return {
        "operator": "Ninja Logistics",
        "insurer": "Etiqa",
        "total_vehicles": len(rows),
        "active_drivers": len(rows),
        "avg_score": avg_score,
        "safe": safe,
        "moderate": moderate,
        "high_risk": high_risk,
        "at_risk": high_risk,
        "annual_premium": annual_premium,
        "annual_premium_static": annual_premium_static,
        "annual_premium_coached": annual_premium_coached,
        "coaching_savings": coaching_savings,
        "vs_static_savings": annual_premium_static - annual_premium,
    }
