# DriveScore — Build Playbook

This is the mechanical build guide. Everything here is concrete enough that implementation is "type it in," not "decide it."

> **Note (historical spec):** This playbook captures the *original* MVP plan. The shipped
> prototype evolved past it — reframed as a Singapore SGD product ("Meridian Motor"), with a
> production-realism presentation layer (policy/NCD/excess chrome, SGD premium build-up,
> recent-trips feed, **claims history**), a **persona switcher**, a **light/dark theme**, a
> **computed loss-ratio model**, and "Live Pricing Engine" renamed "Live Rating Engine". For
> the current state see `README.md`, `ARCHITECTURE.md`, `BUILD_NOTES.md`, and the CEO pitch in
> `DEMO_SCRIPT.md`. The scoring/pricing formulas below remain the engine's source of truth.

## Repo layout
```
scenario-a-motor-insurance/
├── README.md                # setup + run (see README.md template in this folder)
├── frontend/                # React + TS + Vite app
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts           # fetch wrappers + SSE stream reader for /explain
│   │   ├── theme.ts         # design tokens (colors, spacing, touch sizes)
│   │   ├── components/      # shared (Gauge, FactorBar, PremiumDelta, StreamingText, QuadrantScatter)
│   │   └── views/
│   │       ├── DriverDashboard.tsx
│   │       ├── UnderwriterConsole.tsx
│   │       └── PricingEngine.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # Python Lambda handlers
│   ├── handler.py           # routes /score /price /explain /portfolio
│   ├── engine.py            # risk-scoring + pricing formulas (the source of truth)
│   ├── explain.py           # Bedrock Claude call + streaming + cached fallback
│   ├── data.py              # loads bundled driver JSON
│   └── requirements.txt     # boto3 (scikit-learn optional)
├── data/
│   ├── drivers.json         # 500–1000 synthetic drivers (generated)
│   └── explain_cache.json   # pre-baked AI explanations for the hero drivers (fallback)
├── infra/                   # AWS CDK (Python)
│   ├── app.py
│   ├── drivescore_stack.py  # Lambda + Function URL (or HTTP API) + S3 for static site
│   └── requirements.txt
└── scripts/
    ├── gen_data.py          # generates data/drivers.json incl. hero drivers + cohorts
    ├── seed_cache.py        # calls Bedrock once per hero scenario → explain_cache.json
    └── dev.sh               # runs backend locally + vite dev server
```

## Tech stack + versions
- **Frontend:** React 18 + TypeScript 5 + Vite 5. Charts: **Recharts** (scatter, gauges via radial/custom). Styling: **Tailwind CSS 3** with a small design-token layer in `theme.ts`. Touchscreen-aware sizing (the Hub uses big touchscreens): min hit target 44px, slider thumbs ≥ 32px, base font ≥ 18px, headline numbers ≥ 64px.
- **Backend:** **Python 3.12** on AWS Lambda. `boto3` for Bedrock. One handler, route by path. scikit-learn 1.x **optional** (bundle only if time permits; rules engine is primary).
- **AI:** **Amazon Bedrock — Claude Sonnet 4.6.** Bedrock model ID: `anthropic.claude-sonnet-4-6` (Bedrock carries the `anthropic.` prefix; the bare ID is `claude-sonnet-4-6`). Sonnet 4.6 chosen over Opus for demo latency/cost — explanations are short NL summaries where Sonnet is ample and faster to stream, which matters for the live "first 10 seconds" feel. Verify model access Day 1.
- **Infra:** **AWS CDK (Python).** One-command deploy, serverless, ~$0 idle. Demo region **Singapore `ap-southeast-1`**; **fall back to `us-east-1`** if Bedrock model access isn't granted there.

## Day-by-day task list with gates

### D1 — decide + scaffold + fake-it-end-to-end
- `npm create vite@latest frontend -- --template react-ts`; add Tailwind + Recharts.
- Scaffold `backend/handler.py` with the four routes returning **real computed** numbers from `engine.py` (write the scoring/pricing formulas first — they're below, fully specified).
- Write `scripts/gen_data.py`, generate `data/drivers.json`.
- Wire one button in `PricingEngine.tsx` → `POST /score` → render the returned DriveScore.
- **Day-1 Bedrock access check** (do this first): run `aws bedrock list-foundation-models --region ap-southeast-1` and a one-shot `converse` call against `anthropic.claude-sonnet-4-6`. If denied, switch the deploy region to `us-east-1` everywhere and note it in README.
- **GATE:** a UI button calls the backend and renders a REAL computed value.

### D2 — real core logic + hero proof interaction
- Finalize `engine.py`: weighted-factor score (0–100) + pricing (base × multiplier) + delta vs static baseline + per-factor contributions in the response.
- Build the five sliders in `PricingEngine.tsx`; debounce (~150ms) → `/score` + `/price`; render DriveScore, premium gauge, factor bars, and the live delta.
- Implement `/explain` calling Bedrock with **streaming**; render tokens as they arrive in `StreamingText`.
- Run `scripts/seed_cache.py` to bake fallback explanations for the hero scenarios.
- **GATE:** changing a slider changes the output live AND the AI explains it (streamed), naming the dominant factor.

### D3 — the 2 hero screens + design system
- Build **Driver Dashboard** (Sarah preloaded): DriveScore gauge, premium-vs-baseline delta, top-3 factor bars, streamed coaching, savings opportunity.
- Build **Underwriter Console**: `/portfolio` → Recharts scatter colored by quadrant; counts of overcharged-safe and underpriced-risky; repricing-impact panel.
- Lock the design system in `theme.ts`: one accent, generous whitespace, big numbers, consistent card style. Touchscreen sizing throughout.
- **GATE:** all three views navigable, visually coherent, demo-grade.

### D4 — before/after framing + polish + one-command deploy
- Make the static-baseline delta prominent everywhere (the "before/after" is the business story).
- Repricing-impact panel shows quantified retention↑ / losses↓ for the whole book.
- CDK: Lambda (Function URL with streaming, or HTTP API) + S3-hosted built frontend. `cdk deploy` one command.
- **GATE:** fresh clone → follow README → working deployed demo.

### D5 — write-ups + record + buffer
- Finalize ARCHITECTURE.md, BUILD_APPROACH.md (fill the `[fill after building]` slots), README.md.
- Record the ~8-min walkthrough per DEMO_SCRIPT.md.
- **GATE:** all 4 deliverables done; ≥½ day buffer.

## Backend endpoint specs

All endpoints accept/return JSON. CORS open for the demo. Route by `path` in `handler.py`.

### `POST /score`
Compute DriveScore from telematics (used by the live sliders).
- **Request:** `{ "telematics": { "avg_speed_kmh": 78, "hard_brakes_per_100km": 4.1, "night_pct": 0.12, "monthly_km": 1100, "harsh_corners_per_100km": 2.0 } }`
- **Response:** `{ "drivescore": 72, "factors": [ {"name":"Night driving","contribution":18,"value":0.12}, {"name":"Hard braking","contribution":11,"value":4.1}, ... ], "band": "moderate" }`
- **Logic:** normalize each telematics field to a 0–1 risk via the breakpoints below, weight, sum → risk 0–1, DriveScore = `round(100 * (1 - risk))`. `factors` = each factor's points of risk it removed from 100, sorted desc (this is the per-factor contribution that powers explainability and the top-3).

### `POST /price`
Compute the dynamic premium and the delta vs the static table.
- **Request:** `{ "telematics": {...}, "driver_meta": { "age": 41, "postcode": "2000", "vehicle_class": "sedan" } }`
- **Response:** `{ "drivescore": 72, "dynamic_premium": 96.40, "static_premium": 131.00, "delta": -34.60, "multiplier": 0.92, "base_rate": 104.80 }`
- **Logic:** `static_premium` = static-table lookup from `driver_meta` (the legacy baseline). `base_rate` = the insurer's flat base for the segment. `multiplier` = `1 + k*(risk - 0.5)` clamped to `[0.6, 1.8]`. `dynamic_premium = round(base_rate * multiplier, 2)`. `delta = dynamic_premium - static_premium` (negative = customer saves). Always return both so the UI shows before/after.

### `POST /explain`
Natural-language coaching + why-the-price-changed, via Bedrock Claude, **streamed**.
- **Request:** `{ "drivescore": 72, "factors": [...], "delta": -34.60, "context": "driver_dashboard" | "price_change", "changed_factor": "Night driving" }`
- **Response:** streamed text (SSE / Lambda response streaming). On Bedrock failure or >2s to first token, return the matching cached explanation from `data/explain_cache.json`.
- **Logic:** build a prompt from the factor contributions (below) and stream Claude's output.

### `POST /portfolio` (GET acceptable)
Serve the whole synthetic book for the Underwriter Console.
- **Request:** `{}` (or query for pagination — not needed for demo).
- **Response:** `{ "drivers": [ {"id":"D0001","name":"Sarah Chen","drivescore":91,"static_premium":135,"dynamic_premium":100,"delta":-35,"quadrant":"overcharged_safe"}, ... ], "summary": { "overcharged_safe": 142, "underpriced_risky": 118, "projected_retention_gain_pct": 6.4, "projected_annual_loss_reduction": 1840000 } }`
- **Logic:** score+price every driver in `drivers.json`, assign quadrant, compute book-level summary (below).

## Risk-scoring formula (named weighted factors → 0–100)
Each factor → a 0–1 risk component via linear normalization between a "safe" breakpoint (risk 0) and a "risky" breakpoint (risk 1), clamped to `[0,1]`:

| Factor | key | safe (risk 0) | risky (risk 1) | weight |
|---|---|---|---|---|
| Night driving % | `night_pct` | 0.05 | 0.45 | **0.30** |
| Hard braking /100km | `hard_brakes_per_100km` | 1.0 | 9.0 | **0.25** |
| Average speed (km/h) | `avg_speed_kmh` | 60 | 115 | **0.20** |
| Harsh cornering /100km | `harsh_corners_per_100km` | 0.5 | 6.0 | **0.15** |
| Monthly mileage (km) | `monthly_km` | 400 | 2500 | **0.10** |

```
def norm(value, safe, risky):
    return min(1.0, max(0.0, (value - safe) / (risky - safe)))

risk = (0.30*norm(night_pct,0.05,0.45)
      + 0.25*norm(hard_brakes,1.0,9.0)
      + 0.20*norm(avg_speed,60,115)
      + 0.15*norm(harsh_corners,0.5,6.0)
      + 0.10*norm(monthly_km,400,2500))          # risk in [0,1]
drivescore = round(100 * (1 - risk))             # 0–100, higher = safer
# per-factor contribution (points of DriveScore each factor cost):
#   contribution_i = round(100 * weight_i * norm_i)
# top-3 = factors sorted by contribution desc; band: >=80 safe, 60-79 moderate, <60 high-risk
```
Weights chosen so night-driving is the single largest factor — this is why dragging the night slider to the extreme makes the AI correctly name it as dominant (the hero moment).

## Pricing formula (base × multiplier, delta vs static baseline)
```
base_rate     = SEGMENT_BASE[vehicle_class]          # e.g. sedan 104.80, suv 121.00, hatch 92.50
multiplier    = clamp(1 + 1.6*(risk - 0.5), 0.6, 1.8) # safe drivers <1 (discount), risky >1 (surcharge)
dynamic_prem  = round(base_rate * multiplier, 2)
static_prem   = STATIC_TABLE[(age_band, postcode_band, vehicle_class)]  # legacy flat table
delta         = round(dynamic_prem - static_prem, 2)  # negative = saving
```
The static table deliberately ignores behavior, so safe drivers land above their dynamic price (overcharged) and risky drivers below it (underpriced) — exactly the two failure modes the console surfaces.

## Synthetic data spec
Each driver record:
```json
{ "id":"D0001", "name":"Sarah Chen", "age":41, "postcode":"2000", "vehicle_class":"sedan",
  "telematics": {"avg_speed_kmh":64,"hard_brakes_per_100km":1.2,"night_pct":0.04,"monthly_km":650,"harsh_corners_per_100km":0.6} }
```
`scripts/gen_data.py` generates **600 drivers** (within 500–1000):
- Draw telematics from realistic distributions; correlate the five risk factors mildly so cohorts are believable.
- **Cohort A — safe-but-overcharged (~25%)**: low risk factors, but `static_premium` set high (older static table over-prices their segment) → big negative delta.
- **Cohort B — risky-but-underpriced (~20%)**: high risk factors, but `static_premium` set low → positive delta, lands in the loss quadrant.
- Remaining ~55% spread across the middle.
- **Seeded hero drivers (fixed IDs, always present):**
  - `D0001 "Sarah Chen"` — safe, DriveScore ~91, overpaying **~$35/mo** (the protagonist).
  - `D0002 "Marcus Reid"` — risky, lots of night driving, underpriced ~$28/mo (the drag-the-slider villain).
  - `D0003 "Priya N."` — borderline/moderate, used to show a mid-case if asked.

## Frontend view breakdown
- **Shared components:** `Gauge` (DriveScore 0–100, Recharts radial), `PremiumDelta` (big current number + struck-through baseline + ▲/▼ delta), `FactorBar` (horizontal bar per factor contribution), `StreamingText` (renders SSE tokens with a cursor), `QuadrantScatter` (Recharts ScatterChart, color by quadrant, reference lines splitting quadrants).
- **DriverDashboard:** `Gauge` + `PremiumDelta` + top-3 `FactorBar`s + `StreamingText` (coaching) + savings-opportunity card. Preloads Sarah (`D0001`).
- **PricingEngine:** 5 labeled sliders (touch-sized), live `Gauge` + `PremiumDelta` + factor bars, `StreamingText` (why-price-changed) that re-streams on slider release. Debounce score/price; only call `/explain` on release to avoid spamming Bedrock.
- **UnderwriterConsole:** `QuadrantScatter` of `/portfolio`, two big counters (overcharged-safe / underpriced-risky), repricing-impact panel (retention↑, losses↓), and clicking a point opens that driver's mini-dashboard.

## AI integration spec (Bedrock)
- **Model:** `anthropic.claude-sonnet-4-6` via `bedrock-runtime`. Region `ap-southeast-1` (fallback `us-east-1`).
- **Streaming:** use `bedrock_runtime.converse_stream(...)` and forward `contentBlockDelta` text chunks to the client (Lambda response streaming or SSE). Use `messages` + `inferenceConfig={"maxTokens": 300}`. Keep outputs short (2–4 sentences) for snappy streaming.
- **Prompt sketch (`/explain`, price-change context):**
  > System: *"You are a motor-insurance coach. You are given a driver's DriveScore and the per-factor contributions to their risk. Explain in 2–3 plain sentences why their premium just changed, naming the single largest contributing behavior, and give one specific, actionable tip. No jargon, no preamble, no markdown."*
  > User: *"DriveScore: {drivescore}. Premium delta: {delta:+.2f}/mo. Factor contributions (points of risk): {factors as 'name: contribution' list}. The driver just changed: {changed_factor}."*
- **Prompt sketch (`/explain`, driver_dashboard context):** same factors, ask for encouraging coaching + the top saving opportunity (e.g. "reduce night-driving to save ~$X").
- **Why it stays correct (unscripted):** the prompt is grounded in the *actual* factor contributions the engine computed, so when night-driving dominates, the model names night-driving — it isn't guessing.
- **Cached fallback:** `data/explain_cache.json` keyed by `{context}:{dominant_factor}` (and a generic default). If Bedrock errors or first token >2s, stream the cached string instead so the demo never stalls. `scripts/seed_cache.py` pre-bakes entries for Sarah's dashboard and the night-driving / hard-braking / speed price-change cases.

## Deploy steps (CDK)
1. **Day-1 Bedrock access check:** `aws bedrock list-foundation-models --region ap-southeast-1 --query "modelSummaries[?contains(modelId,'sonnet-4-6')]"`; run one `converse` smoke call. If unavailable → set region to `us-east-1` in `infra/` and README.
2. `cd backend && pip install -r requirements.txt -t .` (or use a Lambda layer); `cd frontend && npm install && npm run build`.
3. `cd infra && pip install -r requirements.txt && cdk bootstrap && cdk deploy` — provisions the Lambda (with response streaming enabled), its Function URL / HTTP API, IAM role with `bedrock:InvokeModel*`, and the S3 static site for the built frontend.
4. Output: the site URL. Open it, land on the Driver Dashboard (Sarah).
5. Serverless + on-demand Bedrock = **~$0 idle**.

## Graceful-degradation / fallback plan
- **Bedrock slow/unavailable:** cached explanations stream instead (above). Demo never blocks on the network.
- **Seed hero data:** Sarah, Marcus, and the portfolio summary are deterministic, so every click lands on a compelling number even cold.
- **Extreme slider inputs:** `norm()` clamps to `[0,1]` and the multiplier clamps to `[0.6,1.8]`, so the skeptic can't produce a NaN or an absurd price — it saturates gracefully and the AI still names the dominant factor.
- **Engine is the source of truth:** the optional scikit-learn model is never on the critical path; if it's flaky, drop it — the rules engine alone is a 5.

## Definition of Done (mirrors the §14 bar)
**Auto-fails to avoid:** hardcoded responses or static UIs (the slider must do a real backend recompute); broken clone-to-run; AI explanation that contradicts the numbers; demo that stalls waiting on Bedrock.

**The 5 axes, each at demo-path-5:**
- [ ] **Working prototype + real backend** — slider → `/score`/`/price` recompute live; judges can change inputs and the output changes correctly.
- [ ] **Technology integration** — React+Vite → Lambda → weighted engine + Bedrock Claude (streaming) over synthetic data, orchestrated cleanly.
- [ ] **UI/UX polish** — first 10 seconds land (big DriveScore gauge, clean cards, touch-sized); three views visually coherent.
- [ ] **Business impact clarity** — before/after (dynamic vs static delta) on screen everywhere; repricing-impact panel quantifies retention↑/losses↓.
- [ ] **Executive presence** — runs as a self-explanatory ~10-min CEO walkthrough following the Sarah→fix→portfolio→impact arc.
- [ ] **Clone-to-run** — fresh clone → README → one-command deploy → working demo; no secrets in repo; synthetic data only.

**Stop rule:** done = demo path is a 5 AND deadline met. If behind, cut scope (drop the scikit-learn model, drop console click-through) to keep one thing at a 5 rather than three at a 3. Never trade the deadline for extra polish.
