"""
llm.py — real LLM text generation via a keyless public endpoint.

This is what makes the natural-language layer genuinely AI-driven WITHOUT cloud
credentials: the explanation is produced by an actual language model at request
time, not a static template. Callers prefer, in order:

  1) Amazon Bedrock (Claude) — when AWS creds + model access are present;
  2) THIS keyless LLM       — the default live path (no credentials needed);
  3) deterministic template — only if the network call fails (true offline).

Endpoint: https://text.pollinations.ai/{prompt}?model=...&seed=...  (GPT-class,
OpenAI-compatible, no API key). Non-streaming: we fetch once and the caller
streams the text word-by-word for an identical "typing" UX.

Responses are cached on disk by a hash of (model, system, user) so a recorded
demo is fast and reproducible — the same inputs reproduce the same words, while
*different* inputs produce a genuinely different live generation. Caching a real
model response is standard; the output is still model-generated, never hardcoded.
"""
from __future__ import annotations

import hashlib
import os
import urllib.error
import urllib.parse
import urllib.request

ENDPOINT = "https://text.pollinations.ai/"
MODEL = os.environ.get("LLM_MODEL", "openai")          # GPT-class default
TIMEOUT_S = float(os.environ.get("LLM_TIMEOUT", "20"))
RETRIES = int(os.environ.get("LLM_RETRIES", "1"))       # extra attempts on 429/timeout
BACKOFF_S = float(os.environ.get("LLM_BACKOFF", "1.5"))
ENABLED = os.environ.get("LLM_ENABLED", "1") == "1"     # set 0 to force offline
_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".llm_cache")


class LLMUnavailable(Exception):
    """Raised when the live LLM cannot be used — callers fall back to template."""


def available() -> bool:
    return ENABLED


def _key(system_prompt: str, user_prompt: str) -> str:
    return hashlib.sha256(f"{MODEL}|{system_prompt}|{user_prompt}".encode()).hexdigest()[:24]


def _cache_get(key: str):
    path = os.path.join(_CACHE_DIR, key + ".txt")
    if os.path.isfile(path):
        try:
            with open(path, encoding="utf-8") as f:
                return f.read()
        except OSError:
            return None
    return None


def _cache_put(key: str, text: str) -> None:
    try:
        os.makedirs(_CACHE_DIR, exist_ok=True)
        with open(os.path.join(_CACHE_DIR, key + ".txt"), "w", encoding="utf-8") as f:
            f.write(text)
    except OSError:
        pass


def generate(system_prompt: str, user_prompt: str) -> str:
    """Return model-generated text grounded in the prompt. Raises LLMUnavailable
    on disabled/empty/failed calls so the caller degrades to the template."""
    if not ENABLED:
        raise LLMUnavailable("LLM_ENABLED=0")

    key = _key(system_prompt, user_prompt)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    prompt = (
        f"{system_prompt}\n\n{user_prompt}\n\n"
        "Answer directly in plain prose. No preamble, no markdown, no bullet points."
    )
    seed = int(hashlib.sha256(key.encode()).hexdigest(), 16) % 100000
    url = ENDPOINT + urllib.parse.quote(prompt) + f"?model={MODEL}&seed={seed}"

    import time as _time
    last_err = "unknown"
    for attempt in range(RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "DriveScore/1.0"})
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
                text = resp.read().decode("utf-8", "replace").strip()
            if not text or len(text) < 20 or text.lstrip().startswith("<"):
                last_err = "empty or non-text response"
            else:
                _cache_put(key, text)
                return text
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}"
            if e.code == 429:
                break  # explicit rate-limit — don't hammer; fall back now
        except Exception as e:  # noqa: BLE001 — retry transient errors, then fall back
            last_err = str(e)
        if attempt < RETRIES:
            _time.sleep(BACKOFF_S * (attempt + 1))
    raise LLMUnavailable(last_err)
