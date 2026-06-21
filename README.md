# DriveScore — Usage-Based Motor Insurance (Meridian Motor · Singapore)

DriveScore turns the telematics a regional motor insurer already collects (and leaves unused in a data lake) into **live, explainable, behavior-based premiums**. Instead of static risk tables where everyone in a bracket pays the same, DriveScore scores each driver 0–100 from how they actually drive, prices them dynamically, surfaces the two failure modes of static pricing (safe drivers overcharged → churn; risky drivers underpriced → losses), corroborates the score against the insurer's **claims history**, and explains every number in plain English via Amazon Bedrock. Built for the AWS APJ Innovation Hub prototype challenge — **Scenario A, Financial Services**. Synthetic data only; no real customer data.

The prototype is framed as a real Singapore motor product — **"Meridian Motor · DriveScore"** — so premiums, No-Claims Discount (NCD), excess, cover dates and claims read like a production insurance app (all amounts in **SGD, annualised**). It is **pitched to the CEO of an insurer** (see `DEMO_SCRIPT.md`), not presented as a generic feature tour.

Three views, one story: **Driver Dashboard** (customer), **Live Rating Engine** (the live-recompute proof), **Underwriter Console** (business). A **light/dark theme** toggle (default light) and a **persona switcher** (Sarah / Marcus / Priya) sit in the UI for the walkthrough.

## Prerequisites
- **Node.js** ≥ 18 and npm
- **Python** ≥ 3.9 (developed/verified on 3.9; 3.12 recommended to mirror the Lambda target)
- **No AWS credentials required.** The app runs fully offline: the `/explain` endpoint serves high-quality, grounded canned explanations from `data/explain_cache.json` when Bedrock isn't reachable.
- **Optional — real AI:** to stream from **Amazon Bedrock Claude Sonnet 4.6** (`anthropic.claude-sonnet-4-6`) instead of the offline fallback, configure AWS creds + Bedrock model access in **`ap-southeast-1`** (fallback `us-east-1`) and set `USE_BEDROCK=1`. Verify access:
  ```bash
  aws bedrock list-foundation-models --region ap-southeast-1 \
    --query "modelSummaries[?contains(modelId,'sonnet-4-6')]"
  ```

## One-command local run (recommended)
```bash
./scripts/dev.sh
```
This creates the backend venv (first run), installs deps, starts the FastAPI backend on **http://localhost:8000**, installs frontend deps (first run), and starts the Vite dev server. Open the printed URL — **http://localhost:5173** — and it lands on the Driver Dashboard (Sarah). Works with **zero AWS credentials** (offline AI fallback). To use real Bedrock: `USE_BEDROCK=1 ./scripts/dev.sh`.

> Note: the frontend's first request to `data/drivers.json` is already committed, so no data generation is needed.

## Manual local run (two terminals)
```bash
# Terminal 1 — backend
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn handler:app --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api -> :8000)
```

## Build the frontend (production bundle)
```bash
cd frontend && npm install && npm run build   # type-checks + emits dist/
```

## Cloud deploy (deferred)
Cloud deploy is intentionally **deferred** for this prototype — `infra/` contains
documented CDK stubs and `./scripts/deploy.sh` prints the intended steps. Local
run is the supported path.

## Generate / refresh data (optional — already committed)
```bash
python3 scripts/gen_data.py        # regenerates data/drivers.json (600 drivers + heroes), prints hero numbers
python3 scripts/seed_cache.py      # re-bakes data/explain_cache.json (USE_BEDROCK=1 to bake from real Claude)
```

## Which screens to open + which hero drivers to click
1. **Driver Dashboard** — opens on **Sarah Chen (`D0001`)**: DriveScore ~91, "Platinum driver", NCD 50%, paying ~**S$420/yr (~S$35/mo)** below the standard rate-table. Watch the premium build-up (base ± behaviour − NCD = payable), the recent-trips feed, the AI coaching stream, and the **Claims panel — green "Low risk confirmed", 5 claim-free years**. Use the **persona switcher** to flip to **Marcus Reid (`D0002`)**: the dashboard re-rates live to score 30 with a surcharge, and his **Claims panel shows 2 at-fault claims linked to hard braking + night driving (red "Risk confirmed")** — the claims validate the model.
2. **Live Rating Engine** — the proof. Drag the **night-driving** slider to the extreme: the premium re-rates live and the streamed AI rationale names night-driving as the dominant factor. Then drag **hard-braking** and watch it re-rank. Output is shown as an indicative SGD quote with the full rating build-up.
3. **Underwriter Console** — the whole synthetic book as a risk-vs-price scatter, with an actuarial KPI strip (GWP, **loss ratio 75.8% → 72.0%** computed from adverse selection, retention, avg score). Top-left = overcharged-safe (churn). Bottom-right = underpriced-risky (loss leakage). Click any policy to inspect its rating **and its claims history** in the side panel.

**Theme:** the sun/moon button (top-right) toggles light/dark; defaults to **light** for a clean exec look — recommended for recording.

## Repo layout
```
frontend/   React + TypeScript + Vite (Tailwind, Recharts) — the three views
  src/
    views/         DriverDashboard, PricingEngine (Live Rating Engine), UnderwriterConsole
    components/     Gauge, FactorBar, PremiumDelta, StreamingText, QuadrantScatter,
                    PolicyCard, RatingBreakdown, TripList, ClaimsHistory, PersonaSwitcher
    theme.ts        light/dark palette source (CSS vars + live Proxy tokens) + scoreColor
    domain.ts       SG insurance presentation layer (policy, NCD, excess, SGD premium build-up, tiers)
    trips.ts        deterministic recent-trips feed derived from telematics
    claims.ts       claims system-of-record + DriveScore-validation verdicts
    api.ts          fetch wrappers + SSE reader
backend/    Python (FastAPI, Lambda-shaped) — /score /price /explain /portfolio
            engine.py = scoring/pricing + loss-ratio model (source of truth)
data/       drivers.json (synthetic) + explain_cache.json (AI fallback)
infra/      AWS CDK (Python) — Lambda + Function URL + IAM + S3 static site (deferred stub)
scripts/    gen_data.py, seed_cache.py, dev.sh, deploy.sh
```

**Backend is the source of truth; the SGD/policy/claims chrome is a frontend presentation
layer** (`domain.ts`, `trips.ts`, `claims.ts`) over the engine's real numbers — so every
displayed figure still traces back to live compute. Hero personas' claims are hand-authored;
the rest of the book's claims are derived deterministically from each driver's DriveScore.

## Notes
- **No secrets in the repo.** All AWS access is via your configured credentials; the only "config" is the deploy region.
- **Graceful degradation:** if a Bedrock call is slow (>2s to first token) or fails, DriveScore streams a pre-baked explanation so the demo never stalls.
- This is a prototype for an executive demo, not a production system — expect rough edges off the demo path (no auth, no persistence, in-memory data).
