# DriveScore — Architecture Overview

## Diagram
```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER  (React 18 + TypeScript + Vite, Tailwind, Recharts)           │
│  ┌────────────────┐  ┌─────────────────────┐  ┌────────────────────┐  │
│  │ Driver         │  │ Underwriter Console │  │ Live Rating        │  │
│  │ Dashboard      │  │ (KPI strip: GWP,    │  │ Engine             │  │
│  │ (persona       │  │  loss ratio, reten- │  │ (5 telematics      │  │
│  │  switch +      │  │  tion; mispricing   │  │  sliders → SGD     │  │
│  │  claims)       │  │  map + claims)      │  │  quote build-up)   │  │
│  └───────┬────────┘  └─────────┬───────────┘  └─────────┬──────────┘  │
│  Presentation layer (domain.ts SG policy/NCD/SGD · trips.ts · claims.ts │
│  · theme.ts light/dark) wraps engine numbers — no displayed value faked │
└──────────┼─────────────────────┼────────────────────────┼─────────────┘
           │ POST /score /price  │ GET /portfolio          │ POST /explain (SSE stream)
           ▼                     ▼                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AWS Lambda  (Python 3.12, response streaming enabled)  — handler.py    │
│   ┌──────────────────────────────┐   ┌────────────────────────────┐    │
│   │ engine.py                    │   │ explain.py                 │    │
│   │  • weighted-rules risk score │   │  • builds prompt from the  │    │
│   │    (0–100) + per-factor      │   │    factor contributions    │    │
│   │    contributions             │   │  • streams Claude tokens   │    │
│   │  • base × multiplier pricing │   │  • cached fallback         │    │
│   │  • delta vs static baseline  │   └─────────────┬──────────────┘    │
│   └─────────────┬────────────────┘                 │                    │
│                 │ reads                              │ converse_stream    │
│                 ▼                                    ▼                    │
│        data/drivers.json (600                Amazon Bedrock              │
│        synthetic drivers, bundled)           Claude Sonnet 4.6           │
│        data/explain_cache.json               (anthropic.claude-          │
│        (fallback explanations)                sonnet-4-6)                │
└──────────────────────────────────────────────────────────────────────┘
   Region: ap-southeast-1 (Singapore); fallback us-east-1.  Static site → S3.
   Provisioned by AWS CDK (one command). Serverless, ~$0 idle.
```

## Data flow (request → Lambda → scoring/pricing → Bedrock explain → UI)
1. **User drags a slider** in the Live Rating Engine (or opens Sarah's dashboard). The frontend sends the five telematics values to **`POST /score`** and **`POST /price`**.
2. **Lambda → `engine.py`** normalizes each telematics field to a 0–1 risk via fixed safe/risky breakpoints, applies the named weights (night-driving heaviest), sums to an overall risk, and returns **DriveScore (0–100)** plus the **per-factor contributions** — the points each behavior removed from 100.
3. For pricing, the engine computes `base_rate × multiplier` (multiplier derived from risk, clamped) and looks up the legacy **static-table premium** from the driver's age/postcode/vehicle. It returns both, and the **delta** — the on-screen before/after.
4. The UI renders the DriveScore gauge, the premium-vs-baseline delta, and the top-3 factor bars instantly.
5. On slider release (or dashboard load), the frontend calls **`POST /explain`**. `explain.py` builds a prompt **grounded in the actual factor contributions** and **streams** Claude Sonnet 4.6 from **Amazon Bedrock**; tokens render live. Because the prompt carries the real numbers, the model correctly names the dominant factor — unscripted.
6. The **Underwriter Console** calls **`/portfolio`**, which scores+prices all 600 synthetic drivers, assigns each to a quadrant (overcharged-safe / underpriced-risky), and returns book-level repricing impact plus a **computed loss ratio before/after**. The loss-ratio model anchors expected losses so the static book sits on its filed target (72%), then applies **adverse selection** (overcharged-safe drivers lapsing at `CHURN=0.30`) to lift the *before* ratio — yielding a defensible ~3.8pp improvement (75.8% → 72.0%), not a hardcoded claim. Recharts plots risk vs. price; the KPI strip and claims read live from this.
7. **Presentation layer (frontend):** `domain.ts` derives SG policy chrome (policy no., NCD, excess, SGD annualised premium build-up, tiers); `trips.ts` derives a recent-trips feed; `claims.ts` derives claims history + a DriveScore-validation verdict. All are deterministic functions over the engine's output (hero personas hand-authored), so figures stay consistent and traceable. `theme.ts` is the light/dark palette source (CSS vars + a live Proxy token object).
8. **Degradation:** if Bedrock is slow (>2s to first token) or errors, the matching pre-baked explanation streams from `explain_cache.json`, so the live demo never stalls.

## Why these choices (specific to this scenario)
- **Serverless Lambda, cheap when idle** — the demo runs for minutes on a Hub touchscreen, not 24/7. Lambda + on-demand Bedrock means **~$0 between demos** and nothing to babysit; exactly the "rough edges off the demo path are fine" posture the brief wants.
- **Amazon Bedrock over a self-hosted model** — the coaching is short NL grounded in our own numbers; hosting an LLM would burn build days on infra for no demo gain. Bedrock is a managed `converse_stream` call with IAM auth and streaming built in. **Sonnet 4.6** (not Opus) because the explanations are brief and **first-token latency** drives the live "it's real" feel.
- **Explainable weighted-rules engine over a black-box model** — explainability *is* the feature. A skeptic asks "why 72?" and we show the exact per-factor points. A black-box score would undercut the whole pitch; the deterministic engine also makes every number defensible on camera and makes the AI explanation faithful (it reads the engine's contributions, it doesn't invent them). An optional scikit-learn model can sit behind the rules as a "we can go further" note, but it's never on the critical path.
- **CDK, one-command deploy** — `cdk deploy` stands up Lambda + Function URL + IAM + the S3 static site, so clone-to-run is genuinely one command and reproducible for judges.
- **Synthetic, bundled data** — 600 generated drivers with seeded hero cases (Sarah overpaying $35; Marcus underpriced) means every click lands on a compelling, deterministic number, and there's no real customer data or secret in the repo — satisfying the brief's data rules.
