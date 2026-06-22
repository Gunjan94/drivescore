# DriveScore — Architecture Overview

**Fleet risk & insurance platform.** Synthetic operator **Ninja Logistics** (Singapore last-mile fleet,
~600 vehicles), insured by **Etiqa**. Two audiences: the **Fleet CEO** (safer drivers + lower premium)
and the **Insurer owner** (price real risk). The scoring/pricing engine is the source of truth; the
fleet framing, map, and policy chrome are presentation over its real numbers.

## Diagram
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BROWSER  (React 18 + TypeScript + Vite, Tailwind, Recharts, react-leaflet)     │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐ ┌──────────────────┐     │
│  │ Fleet       │ │ Driver      │ │ Insurer View     │ │ Rating Lab       │     │
│  │ Command     │ │ Detail      │ │ (whole-fleet vs  │ │ (5 telematics    │     │
│  │ (ride MAP + │ │ (per-driver │ │  selected; risk- │ │  sliders → live  │     │
│  │  KPIs +     │ │  trip MAP + │ │  vs-price map;   │ │  re-rate + AI    │     │
│  │  leaderboard│ │  factors +  │ │  mispriced       │ │  rationale)      │     │
│  │  + S$ saved)│ │  claims +AI)│ │  counters→list)  │ │                  │     │
│  └──────┬──────┘ └──────┬──────┘ └────────┬─────────┘ └────────┬─────────┘     │
│   FleetMap (Leaflet + keyless CartoDB/OSM tiles, home-base markers)             │
│   Presentation layer: fleet.ts (operator/insurer, quadrantOf) · domain.ts (SGD, │
│   policy/NCD) · trips.ts · claims.ts · theme.ts (light/dark). No value faked.    │
└──────┬───────────────┬────────────────┬───────────────────────┬────────────────┘
   /fleet/summary   /fleet/trips      /portfolio            /score /price
   /driver/{id}     /driver/{id}/trips                      /explain (SSE)
       │                │                │                       │
       ▼                ▼                ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  AWS Lambda  (Python 3.12, FastAPI via Mangum, Function URL)  — handler.py      │
│   ┌───────────────┐  ┌───────────────┐  ┌────────────────────┐                  │
│   │ engine.py     │  │ geo.py        │  │ explain.py + llm.py │                  │
│   │ • risk score  │  │ • SG routes,  │  │ • prompt grounded   │                  │
│   │   0–100 +      │  │   home bases  │  │   in factor numbers │                  │
│   │   per-factor   │  │ • per-driver  │  │ • keyless LLM (def) │                  │
│   │ • base ×       │  │   trips w/    │  │   → Bedrock (opt)   │                  │
│   │   multiplier   │  │   geo events  │  │   → template        │                  │
│   │ • loss ratio   │  │ • fleet_summary  └─────────┬──────────┘                  │
│   │ • fleet_summary└───────┬───────┘               │                             │
│   └───────┬───────┘        │ reads                 │                             │
│           ▼                ▼                        ▼                             │
│   data/drivers.json (600 synthetic)        text.pollinations.ai (keyless, default)│
│   data/explain_cache.json (fallback)       OR Amazon Bedrock Claude (USE_BEDROCK=1)│
└──────────────────────────────────────────────────────────────────────────────┘
   Region ap-southeast-1.  Frontend → private S3 + CloudFront (OAC, HTTPS).
   Provisioned by AWS CDK (one command). Serverless, ~$0 idle.
```

## The four views, by audience
- **Fleet operator (CEO):** **Fleet Command** (default) — the live **fleet ride map**, fleet KPIs, a
  driver safety leaderboard, and the insurance before/after with a "show the calculation" drill-down;
  and **Driver Detail** — one driver's trips on a map, factor breakdown, claims, AI coaching.
- **Insurer (owner):** **Insurer View** — clearly split into *Across the whole fleet* (mispriced
  counters → clickable driver list, loss ratio, retention) and *Inspect one vehicle* (risk-vs-price
  map + the selected vehicle's pricing).
- **Shared:** **Rating Lab** — the live what-if slider (the "it's real" proof).

## Data flow
1. **Fleet Command** loads `GET /fleet/summary` (fleet KPIs from the engine: 600 vehicles, avg score
   63, band split, annual premium **S$668,544** behaviour-based vs **S$872,724** old flat table =
   **S$204,180/yr** saved, plus a coaching projection **S$62,636/yr**) and `GET /fleet/trips`, which
   `geo.py` builds: deterministic Singapore routes anchored to each driver's **home base** (every trip
   starts/ends home), with safety events geo-located so the map agrees with the score.
2. **Click a route or a leaderboard row →** `GET /driver/{id}` (score/price) + `GET /driver/{id}/trips`
   (that driver's home-anchored trips) → **Driver Detail**. `engine.py` normalizes each telematics
   field to 0–1 risk via fixed breakpoints, applies named weights (night-driving heaviest), and returns
   **DriveScore (0–100)** + **per-factor contributions**.
3. **`POST /explain`** streams the coaching/why-the-price text **grounded in the real factor
   contributions** — keyless public LLM by default (no AWS creds), Amazon Bedrock Claude when
   `USE_BEDROCK=1`, grounded template if both are unreachable. Because the prompt carries the real
   numbers, it names the dominant factor unscripted.
4. **Insurer View** calls **`/portfolio`** (scores+prices all 600 drivers, quadrants each, returns the
   **computed loss ratio before/after**). The loss-ratio model anchors expected losses so the book sits
   on its filed target (72%), then applies **adverse selection** (overcharged-safe drivers lapsing at
   `CHURN=0.30`) to lift the *before* ratio — a defensible **75.8% → 72.0%** (−3.8pp), not a hardcoded
   claim. `fleet.quadrantOf()` on the frontend uses the same thresholds, so the clickable counters
   (**191** overcharged-safe · **117** underpriced-risky) match the engine exactly.
5. **Rating Lab** drags re-call `/score` + `/price` + `/explain` live — backend recompute, not a stored
   number.
6. **Degradation:** if the live AI is slow/unreachable, the grounded template/cache streams instead, so
   the demo never stalls. Map tiles are keyless CDN; routes/markers are vector layers (no marker-asset
   bundling issues).

## Why these choices (specific to this scenario)
- **Keyless map (Leaflet + CartoDB/OSM tiles), no API token** — the fleet map ("show me where my fleet
  drives") is the hero upgrade; keyless tiles keep the whole prototype runnable with zero credentials,
  matching the LLM choice below.
- **Serverless Lambda + Mangum, cheap when idle** — runs for minutes on a Hub touchscreen; **~$0**
  between demos. Mangum buffers SSE on Lambda (text appears at once); local dev keeps token streaming.
- **Keyless LLM by default, Bedrock optional** — the coaching is short NL grounded in our own numbers.
  A keyless public model means the demo shows genuinely live AI with no AWS setup; `USE_BEDROCK=1`
  swaps in Amazon Bedrock Claude once model access is enabled. Either way the AI is **fed the engine's
  real numbers**, so it can never contradict the price.
- **Explainable weighted-rules engine over a black box** — explainability *is* the feature; a skeptic
  asks "why 30?" and we show the exact per-factor points. It also keeps every number defensible on
  camera and the AI explanation faithful.
- **Two-audience information architecture** — Fleet vs Insurer views, and within the Insurer View a
  clean *whole-fleet vs selected-vehicle* split, so it's never ambiguous what a number refers to.
- **CDK one-command deploy** — `cdk deploy` stands up Lambda + Function URL + the S3/CloudFront site;
  clone-to-run is one command and reproducible.
- **Synthetic, bundled data** — 600 generated drivers with seeded hero cases (Marcus risky, Sarah safe)
  means every click lands on a compelling, deterministic number; no real data or secret in the repo.
