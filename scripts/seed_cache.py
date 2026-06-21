"""Pre-bake fallback AI explanations -> data/explain_cache.json.

If AWS creds + Bedrock access are present (and USE_BEDROCK=1), this calls the
real model once per hero scenario and caches the output. Otherwise it writes
high-quality hand-authored explanations keyed by {context}:{dominant_factor}
(plus a generic "default") so the offline demo streams polished, on-message
text that always agrees with the engine's numbers.

Run:  python scripts/seed_cache.py
"""
from __future__ import annotations

import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(_HERE, "..", "backend")))

import engine  # noqa: E402

DATA_DIR = os.path.normpath(os.path.join(_HERE, "..", "data"))

# Hand-authored, grounded fallbacks. Keys match explain.py:
#   "{context}:{dominant_factor_display_name}"  + "default".
HAND_AUTHORED = {
    "driver_dashboard:Night driving": (
        "Your DriveScore reflects strong, steady habits — well done. The one "
        "behavior nudging your risk up most is night driving, so your best "
        "opportunity to save even more is to shift a few late-night trips into "
        "daylight hours where the data shows far fewer incidents."
    ),
    "driver_dashboard:Hard braking": (
        "You're driving well overall. The factor weighing most on your score is "
        "hard braking — leaving a little more following distance lets you brake "
        "earlier and gentler, which would lift your score and trim your premium."
    ),
    "driver_dashboard:Average speed": (
        "Your habits are solid. Average speed is the factor holding your score "
        "back the most; easing off on highways and staying closer to the limit "
        "is the single change that would save you the most."
    ),
    "price_change:Night driving": (
        "Your premium just moved because night driving is now the dominant "
        "factor in your risk profile — late-night trips carry materially higher "
        "claim rates, so the price reflects that. Shifting some of those trips "
        "earlier would bring both your risk and your premium back down."
    ),
    "price_change:Hard braking": (
        "Your premium shifted because hard braking is now the biggest "
        "contributor to your risk. Frequent hard stops signal close-following "
        "and late reactions; more following distance would smooth this out and "
        "lower the price."
    ),
    "price_change:Average speed": (
        "The change is driven mainly by your average speed, which is now the "
        "single largest factor in your risk. Higher sustained speeds raise both "
        "crash likelihood and severity — easing off would correct the premium."
    ),
    "price_change:Harsh cornering": (
        "Harsh cornering is now the leading factor behind your premium change. "
        "Taking bends more smoothly and slowing earlier into corners would "
        "reduce this and bring the price back down."
    ),
    "price_change:Monthly mileage": (
        "Your premium moved largely because of how far you're driving each "
        "month — more time on the road means more exposure. Trimming a few "
        "discretionary trips would lower your risk and your price."
    ),
    "default": (
        "Your premium is calculated live from how you actually drive, not a "
        "static table. Each behavior contributes a transparent number of points "
        "to your risk, so any change you make is reflected directly in the price."
    ),
}


def try_bedrock_seed() -> dict | None:
    """Attempt to bake explanations via the real model. Returns None on failure."""
    if os.environ.get("USE_BEDROCK", "").strip() not in ("1", "true", "True"):
        return None
    try:
        import explain as explain_mod  # noqa: WPS433

        # Build hero payloads and call the real streamer, joining chunks.
        drivers = json.load(open(os.path.join(DATA_DIR, "drivers.json")))
        by_id = {d["id"]: d for d in drivers}
        baked: dict = dict(HAND_AUTHORED)  # start from hand-authored, override

        scenarios = [
            ("D0001", "driver_dashboard", None),
            ("D0002", "price_change", "Night driving"),
        ]
        for did, ctx, changed in scenarios:
            d = by_id[did]
            p = engine.price(d["telematics"], d)
            dom = max(p["factors"], key=lambda f: f["contribution"])
            payload = {
                "drivescore": p["drivescore"],
                "factors": p["factors"],
                "delta": p["delta"],
                "context": ctx,
                "changed_factor": changed,
            }
            text = "".join(explain_mod._bedrock_stream(payload))  # noqa: SLF001
            if text.strip():
                baked[f"{ctx}:{dom['name']}"] = text.strip()
        return baked
    except Exception as exc:  # noqa: BLE001
        print(f"[seed_cache] Bedrock seed skipped: {exc}", file=sys.stderr)
        return None


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    cache = try_bedrock_seed() or HAND_AUTHORED
    out = os.path.join(DATA_DIR, "explain_cache.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2)
    print(f"Wrote {len(cache)} cached explanations -> {out}")


if __name__ == "__main__":
    main()
