> **Current-state addendum (2026-06-22).** Kept as build history. For the current build see **README.md**,
> **ARCHITECTURE.md**, **DEMO_SCRIPT.md**. Net change: B2C consumer motor → **B2B fleet** (Ninja Logistics +
> Etiqa), 4 views, a Leaflet **fleet ride map** with per-driver home bases, `/fleet/*` endpoints, two-audience
> pitch, responsive pass. **Live:** https://d1kfb74r3kp75u.cloudfront.net.

---

# DriveScore — Build Notes

What was actually built, how to run it, what is real vs mocked, and the
verification evidence captured during the build.

## What I built

A full, locally-runnable 3-view prototype for Scenario A (Usage-Based Motor
Insurance — "DriveScore"):

- **backend/** — Python FastAPI server (`handler.py`) exposing `/score`,
  `/price`, `/portfolio`, `/explain` (+ `/driver/{id}`, `/health`). The
  scoring/pricing math lives in `engine.py` (the source of truth); `explain.py`
  does Bedrock streaming with an offline fallback; `data.py` loads bundled JSON.
  Handlers are plain functions so they can later become Lambda handlers.
- **frontend/** — React 18 + TypeScript + Vite + Tailwind + Recharts. Three
  views (Driver Dashboard, Live Rating Engine, Underwriter Console), shared
  components (`Gauge`, `FactorBar`, `PremiumDelta`, `StreamingText`,
  `QuadrantScatter`, plus the production-realism set: `PolicyCard`,
  `RatingBreakdown`, `TripList`, `ClaimsHistory`, `PersonaSwitcher`), SSE stream
  reader in `api.ts`. **Presentation layer:** `domain.ts` (SG policy/NCD/excess/
  SGD premium build-up/tiers), `trips.ts` (recent-trips feed), `claims.ts`
  (claims + DriveScore-validation verdicts). `theme.ts` is the **light/dark
  palette source** (default light) — writes CSS vars + a live Proxy token object,
  toggled by the header sun/moon button (persisted to localStorage).
- **data/** — `drivers.json` (600 deterministic synthetic drivers incl. the
  three hero drivers) and `explain_cache.json` (pre-baked fallback explanations),
  both committed so the app runs without regeneration.
- **scripts/** — `gen_data.py` (seeded generator; prints hero numbers + cohort
  counts), `seed_cache.py` (bakes the fallback cache; uses real Bedrock if
  `USE_BEDROCK=1`), `dev.sh` (one-command local run), `deploy.sh` (deferred stub).
- **infra/** — CDK stubs (`app.py`, `drivescore_stack.py`, `requirements.txt`)
  documenting the intended Lambda + Function URL + IAM + S3 deploy. Cloud deploy
  is deferred per the brief.

## How to run

```bash
./scripts/dev.sh           # backend :8000 + Vite :5173, zero AWS creds needed
# open http://localhost:5173  (USE_BEDROCK=1 ./scripts/dev.sh for real Claude)
```

Manual two-terminal and `npm run build` instructions are in README.md.

## Real vs mocked

| Piece | Status |
|---|---|
| Risk score (0–100) + per-factor contributions | **REAL** — computed in `engine.py` from the BUILDER weighted formula. Changing any input changes the output through real code. Never hardcoded. |
| Dynamic premium, multiplier, static baseline, delta | **REAL** — `base_rate × clamp(1+1.6(risk−0.5))`, static-table lookup, delta. |
| Portfolio scatter + quadrants + repricing impact | **REAL** — every one of the 600 drivers is scored/priced server-side; counts and impact computed from those rows. |
| Loss ratio before/after (Underwriter KPI) | **REAL (computed)** — `engine.loss_ratio_before_after`: expected losses anchored to the static book's filed target (72%), adverse selection (`CHURN=0.30`) lifts the *before* ratio → **75.8% → 72.0% (−3.8pp)**. Not hardcoded. |
| SG policy chrome / SGD premium build-up / NCD / tiers | **DERIVED (presentation)** — `domain.ts` deterministic functions over the engine's premium; annualises to SGD and applies NCD. Real math underneath; chrome is presentational. |
| Recent-trips feed | **DERIVED (presentation)** — `trips.ts`, deterministic from each driver's telematics (event density tracks the score). Illustrative, not stored trips. |
| Claims history + DriveScore-validation verdict | **HAND-AUTHORED for hero personas; DERIVED for the rest** — `claims.ts`. Sarah 0 claims (Low risk confirmed), Marcus 2 at-fault linked to hard braking + night driving (Risk confirmed), Priya 1 not-at-fault. Verdict logic verified for all three. |
| Synthetic driver book | **REAL & committed** — deterministic (seed 42) via `gen_data.py`. |
| `/explain` natural-language text | **REAL when Bedrock is reachable** (boto3 `bedrock-runtime.converse_stream`, model `anthropic.claude-sonnet-4-6`, region from `AWS_REGION` default `ap-southeast-1`). **Grounded TEMPLATED fallback otherwise** — built from the *actual* per-factor contributions the engine produced, so it still names the dominant factor correctly. The scoring/pricing math is real in both modes; only the prose has a fallback. |

The fallback triggers automatically (graceful `try/except`) on missing creds, no
model access, network error, or import failure — verified live (see below).

## Verification evidence (what I actually ran and saw)

**Engine + data generation** (`python3 scripts/gen_data.py`):
```
Wrote 600 drivers -> data/drivers.json
  D0001 Sarah Chen     score= 91 static=$103 dynamic=$68.12 delta=-34.88 quadrant=overcharged_safe
  D0002 Marcus Reid    score= 30 static=$133 dynamic=$159.84 delta=+26.84 quadrant=underpriced_risky
  D0003 Priya N.       score= 64 static=$118 dynamic=$71.41 delta=-46.59 quadrant=fair
  Cohorts: overcharged_safe=191 underpriced_risky=117 fair=292
  Impact: retention +7.0% loss-reduction $3,509,260
```
Hero numbers match the spec: Sarah ~91 / overpaying ~$35; Marcus risky /
underpriced ~$28.

**Real recompute proof** (`POST /score`, night_pct 0.05 → 0.45, all else equal):
- score **95 → 65**; dominant factor flips to **Night driving (30 pts)**.
- `POST /price` same swing: premium **−$34.88 → +$72.66**, multiplier 0.65 → 1.68.
This is the hero moment: dragging one slider changes the output through real code.

**All four endpoints through the Vite proxy** (`/api/*` → backend), captured live:
- `/api/driver/D0001` → `Sarah Chen score 91 static 103.0 dyn 68.12 delta -34.88`
- `/api/price` (Marcus) → `score 30 delta 26.84 top Night driving 22`
- `/api/portfolio` → `{overcharged_safe: 191, underpriced_risky: 117, fair: 292, retention +7.0%, loss $3.5M}`
- `/api/explain` (streamed, price_change, night dominant) →
  *"Your premium just moved because night driving is now the dominant factor in
  your risk profile … Shifting some of those trips earlier would bring both your
  risk and your premium back down."* — streamed token-by-token, names the right factor.

**Bedrock fallback verified:** with the dev machine's (invalid) AWS token, the
backend attempted `ConverseStream`, logged `UnrecognizedClientException`, and
fell back to the grounded templated explanation — the demo did not stall. stderr:
```
[explain] Bedrock unavailable, using fallback: ... ConverseStream ... security token included in the request is invalid
```

**Frontend build** (`npm run build`): TypeScript `tsc --noEmit` passes, Vite
emits `dist/` (`index.html`, CSS, JS bundle ~590 kB), `✓ built in ~2.3s`, no errors.

**Dev server**: Vite serves the app and proxies `/api`; verified live — `/`, `/api/health`,
`/api/driver/D000{1,2}`, `/api/price`, `/api/portfolio`, `/api/explain` (SSE) all return 200
through the proxy. Live recompute confirmed (night-driving 35%→60% → score 30→22, premium
re-rates up). `/api/health` reported `explain_source:"bedrock"`.

**Production-realism iteration (post-MVP):** reframed as SG product "Meridian Motor ·
DriveScore" (SGD annualised); added policy/NCD/excess chrome, premium build-up, recent-trips
feed, **claims history with DriveScore-validation verdicts**, a **persona switcher**
(Sarah/Marcus/Priya), and a **light/dark theme** (default light). Replaced the hardcoded
loss-ratio claim with a **computed** adverse-selection model (75.8% → 72.0%, −3.8pp).
`DEMO_SCRIPT.md` rewritten as a **CEO pitch** (problem → stakes → live proof → P&L → pilot ask)
incorporating the persona-switch and claims beats. All builds pass; servers run.

## Deviations from the BUILDER (and why)

- **Model:** Followed the BUILDER's explicit pin — Bedrock `converse_stream`
  with `anthropic.claude-sonnet-4-6`. (The Claude-API skill's default-to-Opus
  guidance is overridden by the brief's explicit requirement.)
- **Static table tuned:** the BUILDER's example used a static of 131 for a
  mid/metro/sedan, but the exact "score 91 + overpaying $35" target is only
  reachable with a lower static (the score↔price formula ties them tightly). I
  set the mid/metro/sedan static to 103 so Sarah lands at score 91 / −$34.88,
  matching the demo narrative. All other math is the BUILDER formula verbatim.
- **Multiplier floor** raised 0.60 → 0.65 so safe-driver prices stay sensible.
- **Cloud deploy deferred** per the brief — `infra/` and `deploy.sh` are
  documented stubs; local run is the supported path.
- **Vite proxy target** is overridable via `VITE_BACKEND` (added so the build
  could be verified on non-default ports alongside other workloads); defaults to
  `http://localhost:8000`.

## Known rough edges (off the demo path — acceptable per the brief)

- No auth, no persistence, in-memory data (intended).
- Priya (D0003) lands in the "fair" quadrant — used deliberately as the neutral
  third persona in the switcher (her claims verdict reads "Consistent with DriveScore").
- Loss ratio, retention, trips and claims for non-hero drivers are illustrative/derived
  (deterministic from the score), not stored historical data — clearly framed as modelled.
- The frontend JS bundle is ~570 kB (Recharts) — fine for a demo; not code-split.
- Dev ports 8000/5173 assume a clean machine. During this build another
  scenario's dev server occupied 5173, which is why dev.sh uses those defaults
  but the proxy target is env-overridable.
- The offline explanation is templated, not model-generated — by design, so the
  demo never stalls; flip `USE_BEDROCK=1` with valid creds for live Claude.
