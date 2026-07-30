"""Natural-language coaching / why-the-price-changed.

Real Bedrock (Claude Sonnet 4.6 via bedrock-runtime.converse_stream) when AWS
creds + model access are present (USE_BEDROCK=1, or graceful auto-detect);
otherwise a high-quality TEMPLATED fallback grounded in the SAME per-factor
contributions the engine computed. The scoring/pricing math is real in both
modes — only the prose differs offline.

Both paths are exposed as a generator of text chunks so the FastAPI layer can
stream tokens to the browser (SSE) identically regardless of source.
"""
from __future__ import annotations

import json
import os
from typing import Iterator

from data import load_explain_cache

# Bedrock model: in ap-southeast-1 claude-sonnet-4-6 must be invoked via its
# (global) inference profile, not the bare on-demand model id.
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "global.anthropic.claude-sonnet-4-6")
BEDROCK_REGION = os.environ.get("AWS_REGION", "ap-southeast-1")
# Explicit opt-in; if unset we still TRY Bedrock and fall back on any failure.
USE_BEDROCK = os.environ.get("USE_BEDROCK", "").strip() in ("1", "true", "True")

SYSTEM_PROMPT = (
    "You are a motor-insurance coach. You are given a driver's DriveScore and "
    "the per-factor contributions to their risk. Explain in 2-3 plain sentences "
    "why their premium just changed (or where they stand). You MUST state the "
    "DriveScore number, and when a premium delta is provided, state the approximate "
    "monthly dollar change. Name the single largest contributing behavior explicitly "
    "and give one specific, actionable tip. Use only the numbers provided; do not "
    "invent figures. No jargon, no preamble, no markdown."
)


def _dominant_factor(factors: list[dict]) -> dict | None:
    """Highest-contribution factor (factors are pre-sorted desc by the engine,
    but be defensive)."""
    if not factors:
        return None
    return max(factors, key=lambda f: f.get("contribution", 0))


def build_prompt(payload: dict) -> str:
    drivescore = payload.get("drivescore")
    delta = payload.get("delta")
    context = payload.get("context", "driver_dashboard")
    changed = payload.get("changed_factor")
    factors = payload.get("factors", [])

    factor_lines = ", ".join(
        f"{f['name']}: {f['contribution']}" for f in factors[:5]
    )
    parts = [f"DriveScore: {drivescore}."]
    if delta is not None:
        parts.append(f"Premium delta: {delta:+.2f}/mo (negative = saving).")
    parts.append(f"Factor contributions (points of risk): {factor_lines}.")
    if context == "price_change":
        if changed:
            parts.append(f"The driver just changed: {changed}.")
        parts.append("Explain why their premium just changed.")
    else:
        parts.append(
            "Give encouraging coaching and name the single best opportunity "
            "to save more."
        )
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Templated fallback (offline) — grounded in the real factor contributions
# ---------------------------------------------------------------------------
def _format_value(factor: dict) -> str:
    key = factor.get("key", "")
    v = factor.get("value", 0)
    if key == "night_pct":
        return f"{round(v * 100)}% of trips at night"
    if key == "hard_brakes_per_100km":
        return f"{v:g} hard brakes per 100km"
    if key == "avg_speed_kmh":
        return f"an average speed of {v:g} km/h"
    if key == "harsh_corners_per_100km":
        return f"{v:g} harsh corners per 100km"
    if key == "monthly_km":
        return f"{round(v)} km a month"
    return f"{v:g}"


def _tip_for(factor: dict) -> str:
    key = factor.get("key", "")
    return {
        "night_pct": "shifting even a few late-night trips to daylight hours",
        "hard_brakes_per_100km": "leaving more following distance so you brake earlier and gentler",
        "avg_speed_kmh": "easing off on highways and keeping closer to the limit",
        "harsh_corners_per_100km": "taking corners more smoothly and slowing earlier into bends",
        "monthly_km": "trimming a few discretionary trips or car-pooling where you can",
    }.get(key, "smoothing out your driving overall")


def templated_explanation(payload: dict) -> str:
    """A defensible, on-brand explanation built from the engine's numbers.

    First tries the pre-baked cache (seed_cache.py) keyed by
    {context}:{dominant_factor}; otherwise composes one live from the factors.
    """
    factors = payload.get("factors", [])
    context = payload.get("context", "driver_dashboard")
    drivescore = payload.get("drivescore", 0)
    delta = payload.get("delta")
    dom = _dominant_factor(factors)

    # Cache lookup (pre-baked hero scenarios).
    cache = load_explain_cache()
    if dom is not None:
        key = f"{context}:{dom['name']}"
        if key in cache:
            return cache[key]
    if "default" in cache and dom is None:
        return cache["default"]

    if dom is None or dom.get("contribution", 0) == 0:
        return (
            f"Your DriveScore is {drivescore} out of 100 — excellent. None of "
            "your driving behaviors are pushing your risk up meaningfully, so "
            "you're earning the best available price. Keep it up."
        )

    name = dom["name"].lower()
    detail = _format_value(dom)
    tip = _tip_for(dom)

    if context == "price_change":
        direction = "lower" if (delta is not None and delta < 0) else "higher"
        if delta is not None and abs(delta) >= 0.01:
            money = (
                f"about ${abs(delta):.0f}/month {'less' if delta < 0 else 'more'}"
            )
        else:
            money = "about the same"
        return (
            f"Your premium just moved {direction} — now {money} than the static "
            f"table. The biggest driver of your DriveScore of {drivescore} is "
            f"{name} ({detail}), which is costing you {dom['contribution']} points. "
            f"Try {tip} to bring it back down."
        )

    # driver_dashboard / coaching
    return (
        f"Your DriveScore is {drivescore} out of 100. The single biggest factor "
        f"holding it back is {name} ({detail}), costing {dom['contribution']} "
        f"points. Your best opportunity to save more is {tip} — that alone would "
        "lift your score and lower your premium."
    )


# ---------------------------------------------------------------------------
# Real Bedrock streaming
# ---------------------------------------------------------------------------
def _bedrock_stream(payload: dict) -> Iterator[str]:
    """Yield text chunks from Bedrock converse_stream. Raises on any failure so
    the caller can fall back."""
    import boto3  # local import so offline mode needs no boto3 at call time

    client = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)
    user_msg = build_prompt(payload)
    resp = client.converse_stream(
        modelId=BEDROCK_MODEL_ID,
        system=[{"text": SYSTEM_PROMPT}],
        messages=[{"role": "user", "content": [{"text": user_msg}]}],
        inferenceConfig={"maxTokens": 300, "temperature": 0.5},
    )
    for event in resp["stream"]:
        if "contentBlockDelta" in event:
            delta = event["contentBlockDelta"]["delta"]
            if "text" in delta:
                yield delta["text"]


def stream_explanation(payload: dict) -> Iterator[str]:
    """Public entry point used by the FastAPI handler.

    Strategy:
      * If Bedrock is configured/available, stream the real tokens.
      * On ANY error (no creds, no access, network, import), fall back to the
        templated explanation so the demo never stalls.

    Yields plain text chunks. The HTTP layer wraps them as SSE.
    """
    # Decide whether to even attempt Bedrock. USE_BEDROCK forces an attempt;
    # otherwise we only attempt if creds look present, to avoid a slow timeout
    # on every offline request.
    # Only attempt Bedrock when explicitly enabled (USE_BEDROCK=1). Otherwise go
    # straight to the live keyless LLM — avoids a slow failing AWS round-trip when
    # creds are absent/expired.
    attempt = USE_BEDROCK
    if attempt:
        try:
            produced = False
            for chunk in _bedrock_stream(payload):
                produced = True
                yield chunk
            if produced:
                return
        except Exception as exc:  # noqa: BLE001 — fall back on anything
            # Surface once to stderr for the operator; never to the client.
            import sys

            print(f"[explain] Bedrock unavailable, trying live LLM: {exc}", file=sys.stderr)

    # Live keyless LLM — the DEFAULT real-AI path (no AWS creds needed). The
    # explanation is genuinely model-generated, grounded in the engine's numbers.
    try:
        import llm

        text = llm.generate(SYSTEM_PROMPT, build_prompt(payload))
        for word in _word_chunks(text):
            yield word
        return
    except Exception as exc:  # noqa: BLE001 — only now do we use the template
        import sys

        print(f"[explain] live LLM unavailable, using template: {exc}", file=sys.stderr)

    # Offline / fallback path: stream the templated text word-by-word so the UI
    # still gets a live "typing" feel.
    text = templated_explanation(payload)
    for word in _word_chunks(text):
        yield word


def _word_chunks(text: str) -> Iterator[str]:
    words = text.split(" ")
    for i, w in enumerate(words):
        yield (w if i == 0 else " " + w)


def _has_aws_creds() -> bool:
    if os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get("AWS_SECRET_ACCESS_KEY"):
        return True
    if os.environ.get("AWS_PROFILE"):
        return True
    # Shared credentials file present?
    cred_file = os.path.expanduser(os.path.join("~", ".aws", "credentials"))
    return os.path.exists(cred_file)


def source_label() -> str:
    """For diagnostics: report which mode actually serves right now."""
    if USE_BEDROCK:
        return "bedrock"
    try:
        import llm
        if llm.available():
            return "llm"
    except Exception:  # noqa: BLE001
        pass
    return "offline-template"
