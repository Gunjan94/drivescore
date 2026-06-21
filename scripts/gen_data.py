"""Generate the synthetic driver book -> data/drivers.json (deterministic).

600 drivers: ~25% safe-but-overcharged (Cohort A), ~20% risky-but-underpriced
(Cohort B), ~55% spread across the middle. Three seeded hero drivers with fixed
IDs and hand-tuned telematics so demo clicks land on compelling numbers:

  D0001 Sarah Chen  — safe, DriveScore ~91, overpaying ~$35/mo
  D0002 Marcus Reid — risky night driver, underpriced ~$28/mo
  D0003 Priya N.    — borderline / moderate

Seeded RNG so the file is reproducible. The script scores each generated driver
with the real engine and nudges metadata so the cohorts land in the intended
quadrants — the numbers the console shows are never hand-typed.
"""
from __future__ import annotations

import json
import os
import random
import sys

# Make the backend engine importable.
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(_HERE, "..", "backend")))

import engine  # noqa: E402

SEED = 42
N = 600
DATA_DIR = os.path.normpath(os.path.join(_HERE, "..", "data"))

FIRST = [
    "Sarah", "Marcus", "Priya", "James", "Mei", "Liam", "Aisha", "Noah",
    "Olivia", "Raj", "Emma", "Hiro", "Sofia", "Daniel", "Ava", "Wei",
    "Isla", "Mateo", "Zara", "Ethan", "Chloe", "Arjun", "Grace", "Tom",
    "Layla", "Felix", "Nina", "Omar", "Ruby", "Kai",
]
LAST = [
    "Chen", "Reid", "Nair", "Walker", "Tan", "O'Brien", "Khan", "Smith",
    "Rossi", "Patel", "Jones", "Sato", "Garcia", "Lee", "Brown", "Wong",
    "Murphy", "Silva", "Ali", "Clarke", "Singh", "Taylor", "Nguyen",
    "Adams", "Costa", "Park", "Diaz", "Hassan", "Evans", "Kumar",
]
VEHICLES = ["sedan", "suv", "hatch"]
METRO = ["2000", "2010", "1000", "2150"]
REGIONAL = ["3550", "4870", "6230", "7250"]


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def safe_telematics(rng: random.Random) -> dict:
    return {
        "avg_speed_kmh": round(clamp(rng.gauss(64, 4), 50, 80), 1),
        "hard_brakes_per_100km": round(clamp(rng.gauss(1.3, 0.6), 0.2, 3.5), 1),
        "night_pct": round(clamp(rng.gauss(0.05, 0.03), 0.0, 0.18), 3),
        "monthly_km": round(clamp(rng.gauss(720, 220), 250, 1600)),
        "harsh_corners_per_100km": round(clamp(rng.gauss(0.8, 0.5), 0.1, 2.5), 1),
    }


def risky_telematics(rng: random.Random) -> dict:
    return {
        "avg_speed_kmh": round(clamp(rng.gauss(102, 8), 80, 120), 1),
        "hard_brakes_per_100km": round(clamp(rng.gauss(7.0, 1.6), 3.5, 11), 1),
        "night_pct": round(clamp(rng.gauss(0.38, 0.08), 0.18, 0.6), 3),
        "monthly_km": round(clamp(rng.gauss(1900, 400), 900, 2800)),
        "harsh_corners_per_100km": round(clamp(rng.gauss(4.8, 1.3), 2.0, 7.5), 1),
    }


def mid_telematics(rng: random.Random) -> dict:
    return {
        "avg_speed_kmh": round(clamp(rng.gauss(82, 10), 60, 110), 1),
        "hard_brakes_per_100km": round(clamp(rng.gauss(3.8, 1.5), 1.0, 8.0), 1),
        "night_pct": round(clamp(rng.gauss(0.18, 0.07), 0.04, 0.4), 3),
        "monthly_km": round(clamp(rng.gauss(1200, 350), 500, 2400)),
        "harsh_corners_per_100km": round(clamp(rng.gauss(2.4, 1.0), 0.5, 5.5), 1),
    }


def hero_drivers() -> list[dict]:
    return [
        {
            "id": "D0001",
            "name": "Sarah Chen",
            "age": 41,
            "postcode": "2000",  # metro sedan -> static 131 (mid/metro/sedan)
            "vehicle_class": "sedan",
            "telematics": {
                "avg_speed_kmh": 62,
                "hard_brakes_per_100km": 2.0,
                "night_pct": 0.10,
                "monthly_km": 640,
                "harsh_corners_per_100km": 0.6,
            },
        },
        {
            "id": "D0002",
            "name": "Marcus Reid",
            "age": 29,
            # mid/regional so the static table UNDER-prices his genuinely risky
            # driving -> underpriced_risky quadrant, ~+$28/mo shortfall.
            "postcode": "3550",  # regional
            "vehicle_class": "suv",
            "telematics": {
                "avg_speed_kmh": 99,
                "hard_brakes_per_100km": 6.2,
                "night_pct": 0.35,
                "monthly_km": 1820,
                "harsh_corners_per_100km": 4.3,
            },
        },
        {
            "id": "D0003",
            "name": "Priya N.",
            "age": 35,
            "postcode": "2010",  # metro
            "vehicle_class": "hatch",
            "telematics": {
                "avg_speed_kmh": 84,
                "hard_brakes_per_100km": 3.9,
                "night_pct": 0.17,
                "monthly_km": 1250,
                "harsh_corners_per_100km": 2.3,
            },
        },
    ]


def main() -> None:
    rng = random.Random(SEED)
    drivers: list[dict] = []

    # Heroes first (fixed IDs).
    heroes = hero_drivers()
    for h in heroes:
        h.pop("age_band_note", None)
    drivers.extend(heroes)

    n_safe = int(N * 0.25)
    n_risky = int(N * 0.20)
    n_mid = N - len(heroes) - n_safe - n_risky

    idx = len(heroes) + 1

    def make(cohort: str):
        nonlocal idx
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        if cohort == "safe":
            tel = safe_telematics(rng)
            age = rng.choice([45, 52, 58, 63, 48, 41])
            # Push static high: metro + suv/sedan over-prices the safe cohort.
            postcode = rng.choice(METRO)
            vehicle = rng.choice(["suv", "sedan"])
        elif cohort == "risky":
            tel = risky_telematics(rng)
            age = rng.choice([27, 31, 34, 29, 38])
            # Push static low: regional + hatch under-prices the risky cohort.
            postcode = rng.choice(REGIONAL)
            vehicle = rng.choice(["hatch", "sedan"])
        else:
            tel = mid_telematics(rng)
            age = rng.randint(24, 64)
            postcode = rng.choice(METRO + REGIONAL)
            vehicle = rng.choice(VEHICLES)
        rec = {
            "id": f"D{idx:04d}",
            "name": name,
            "age": age,
            "postcode": postcode,
            "vehicle_class": vehicle,
            "telematics": tel,
        }
        idx += 1
        return rec

    for _ in range(n_safe):
        drivers.append(make("safe"))
    for _ in range(n_risky):
        drivers.append(make("risky"))
    for _ in range(n_mid):
        drivers.append(make("mid"))

    os.makedirs(DATA_DIR, exist_ok=True)
    out = os.path.join(DATA_DIR, "drivers.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(drivers, f, indent=2)

    # --- report: verify hero numbers + cohort populations land right ---
    rows = [engine.score_driver(d) for d in drivers]
    summary = engine.portfolio_summary(rows)
    by_id = {r["id"]: r for r in rows}
    print(f"Wrote {len(drivers)} drivers -> {out}")
    for hid in ("D0001", "D0002", "D0003"):
        r = by_id[hid]
        print(
            f"  {hid} {r['name']:14s} score={r['drivescore']:3d} "
            f"static=${r['static_premium']:.0f} dynamic=${r['dynamic_premium']:.2f} "
            f"delta={r['delta']:+.2f} quadrant={engine.quadrant(r['drivescore'], r['delta'])}"
        )
    print(
        f"  Cohorts: overcharged_safe={summary['overcharged_safe']} "
        f"underpriced_risky={summary['underpriced_risky']} fair={summary['fair']}"
    )
    print(
        f"  Impact: retention +{summary['projected_retention_gain_pct']}% "
        f"loss-reduction ${summary['projected_annual_loss_reduction']:,}"
    )


if __name__ == "__main__":
    main()
