# DriveScore — Dynamic Motor Insurance Intelligence

## One-line pitch
DriveScore turns the telematics already sitting unused in a motor insurer's data lake into live, explainable, behavior-based premiums — so safe drivers stop overpaying and risky drivers stop being a hidden loss.

## The customer problem (from the brief)
A regional motor insurer prices premiums with **static risk tables** (age, postcode, vehicle type). Every driver in a bracket pays the same regardless of how they actually drive. The insurer **collects telematics** — speed, hard-braking, time of day, route, mileage, harsh cornering — but it **sits unused in a data lake**. The result is two simultaneous failures:

- **Safe drivers are overcharged** → they feel it, shop around, and churn.
- **Risky drivers are underpriced** → they generate claims and losses.

The insurer cannot surface risk from driving data *before* it turns into claims. The challenge: use telematics to calculate dynamic premiums, surface risk patterns, and give drivers visibility into how their habits affect price.

## Presentation framing — a real SG motor product
The prototype is dressed as **"Meridian Motor · DriveScore"**, a Singapore comprehensive
motor product. All money is **SGD, annualised**; the UI carries real insurance chrome —
policy number, comprehensive cover, **No-Claims Discount (NCD, 0–50% SG scale)**, excess,
cover dates, vehicle/plate, and **claims history**. A **light/dark theme** (default light)
and a **persona switcher** support the walkthrough. This chrome is a frontend presentation
layer over the engine's real numbers; nothing displayed is faked.

## The concept — three connected views, one story
DriveScore is a single web app with three views that tell one narrative end to end.

### 1. Driver Dashboard (customer view)
What a real policyholder would see in their insurer app.
- **Persona switcher** — flip between the three demo customers (Sarah / Marcus / Priya); the dashboard re-rates live.
- **DriveScore 0–100** (headline gauge) + program **tier** (Platinum / Silver / Watch).
- **Policy card** — policy no., comprehensive cover, NCD %, excess, cover period, vehicle + plate.
- **Premium build-up** (annual SGD): base premium ± DriveScore behaviour adjustment − NCD = annual premium payable, shown against the standard rate-table price (the before/after delta).
- **Recent-trips feed** — each trip scored, with hard-brake / night / speeding events flagged.
- **Claims history** — system-of-record panel that **validates the DriveScore** (see below).
- **AI-generated coaching**, streamed live, grounded in the real factor contributions.

### 2. Live Rating Engine (the proof)
The interactive proof that this is a real backend, not a mockup. Framed as an underwriter's
indicative-quote workbench.
- Five telematics **sliders**: avg speed, hard-braking / 100km, night-driving %, monthly mileage, harsh cornering / 100km.
- Drag any slider → **DriveScore and premium re-rate in real time** via the backend.
- Output shown as an **indicative SGD quote** with the full rating build-up and tier.
- The factor breakdown updates live and the AI rationale re-streams, naming the dominant factor.

### 3. Underwriter Console (business view)
What the insurer's pricing team would see across the whole book.
- **Actuarial KPI strip**: Gross Written Premium, **loss ratio (computed before/after)**, retention rate, average DriveScore.
- **Mispricing map**: every driver plotted as risk (DriveScore) vs. current price.
  - **Overcharged-safe** (top-left): low risk, high price → churn risk.
  - **Underpriced-risky** (bottom-right): high risk, low price → loss leakage.
- **Repricing-impact panel**: apply DriveScore pricing across the book → projected **retention up**, **annual loss leakage recovered**.
- **Inspect panel**: click any policy to see its rating **and its claims history**.

## Claims history — the validation beat
Claims are the insurer's ground truth, so the prototype uses them to **prove the DriveScore is right**, not just plausible:
- **Sarah (safe, 91):** 0 claims, 5 claim-free years → green **"Low risk confirmed"** — proving she's genuinely low-risk and currently overcharged.
- **Marcus (risky, 30):** 2 **at-fault** claims, each linked back to the exact factor the model flagged (rear-end → hard braking; night single-vehicle → night driving) → red **"Risk confirmed by claims"** — proving the static table underpriced a real loss-maker.
- **Priya (avg, 64):** 1 not-at-fault claim → neutral "Consistent with DriveScore."

The pitch line this enables: *"The model didn't guess — your own claims history confirms it called the risk."*

## The hero demo moment — what a 5 looks like
A skeptic in the room grabs the **night-driving slider** and drags it to an extreme.
- The **premium re-rates live** (real backend recompute, not a canned number).
- The **streaming AI explanation correctly names night-driving as the dominant factor** — unscripted, because it's reading the actual factor contributions the engine just produced.
- Switching to **Marcus** shows the dashboard re-rate to a surcharge, and his **claims confirm the model** — the "loss leakage with a name and a face" moment.

"5 out of 5" = *I'd put this in front of a customer CEO tomorrow, unedited.* The skeptic tries to break it by feeding extreme inputs; the score, the explanation, the claims corroboration, and the portfolio view all stay coherent and correct.

## The "real backend" proof
The load-bearing proof is the **slider → recompute** round trip: changing an input changes the output, computed server-side by a transparent **weighted-rules risk engine**. The engine is explainable by design — it returns the per-factor contribution to the score, so the UI can show *why* the score moved. Explainability is the feature, not a footnote. (Optionally backed by a small scikit-learn model trained on the synthetic data, but the rules engine is the source of truth for the demo so every number is defensible on camera.)

Dynamic pricing = **base rate × risk multiplier**, always shown as a **delta vs. the static-table baseline** so the before/after value is on screen.

## Demo narrative
> "Meet Sarah. She's a careful driver — low speed, almost no hard-braking, barely drives at night. Today her insurer charges her ~S$420/year more than her driving deserves, because pricing is based on a static table. Sarah is exactly the customer who churns. Now meet Marcus: aggressive, lots of night driving — and he's *underpriced*. He's a loss waiting to happen, and his claims already prove it. The insurer has the telematics to see both of these problems. It just isn't using it. Here's how we fix both — live."

Then: open Sarah's dashboard (overcharged ~S$420/yr, claims confirm low risk) → switch to Marcus and show his claims confirming the model → in the Live Rating Engine, drag the night-driving slider and watch the price correct itself with a live AI explanation → flip to the Underwriter Console and show the mispricing map + computed loss-ratio improvement → close on the repricing-impact numbers (retention up, loss leakage recovered).

> **The full CEO pitch script lives in `DEMO_SCRIPT.md`** — this section is the concept summary.

## Feature → scored-criteria map

| Feature | Scored criterion it proves | Demo-path? | Bar |
|---|---|---|---|
| Slider → `/score` + `/price` live recompute | 1. Working prototype w/ real backend | **Demo-path** | Must be a 5 — this is the "it's real" proof |
| Weighted-rules engine returns per-factor contributions | 1. Real processing; 2. Tech integration | **Demo-path** | Must be a 5 |
| `/explain` → Bedrock Claude streaming coaching + why-price-changed | 2. Tech integration (AI+cloud+data); 3. UI polish | **Demo-path** | Must be a 5; cached fallback required |
| Driver Dashboard (DriveScore, premium gauge, top-3, coaching) | 3. UI/UX polish; 4. Business impact | **Demo-path** | Must be a 5 |
| Underwriter Console scatter + two-failure-mode quadrants | 4. Business impact clarity | **Demo-path** | Must be a 5 |
| Repricing-impact panel (retention↑, losses↓) | 4. Business impact (before/after on screen) | **Demo-path** | Must be a 5 |
| Delta-vs-static-baseline shown on every premium | 4. Business impact clarity | **Demo-path** | Must be a 5 |
| Self-explanatory 10-min narrative arc (Sarah → fix → portfolio → impact) | 5. Executive presence | **Demo-path** | Must be a 5 |
| `/portfolio` endpoint serving 500–1000 synthetic drivers | 1. Real backend; 2. Data | **Demo-path** | 5 (drives the console) |
| CDK one-command deploy + clone-to-run README | 1. Working prototype (clone-to-run) | **Demo-path** | Must be a 5 |
| Optional scikit-learn model behind the rules engine | 2. Tech integration (bonus) | Off-path | Rough edges OK; skip if behind |
| Driver search / filter / pagination in console | — | Off-path | Rough edges OK |
| Auth, multi-user, settings, account screens | — (anti-criteria) | Off-path | Do NOT build |
| Editing driver records, persistence of changes | — | Off-path | Not needed; in-memory is fine |
| Error handling for malformed/extreme inputs *off* the demo path | — (anti-criteria) | Off-path | Clamp gracefully; don't gold-plate |

## Explicit non-goals (anti-criteria — never spend effort here)
Production-grade code, tests, CI/CD, multi-env, monitoring/logging infra, comprehensive edge-case handling, a "finished product," docs beyond the four deliverables. Synthetic data only — no real customer data, no secrets in the repo.

## Top risk + mitigation
**Risk:** the DriveScore feels arbitrary ("why 72?"). **Mitigation:** explainability is built into the engine — every score ships with its per-factor contributions, the UI shows them, and the AI explanation reads from them. A skeptic can interrogate any number and get a consistent answer. Overall build risk is **LOW**: the core is a deterministic weighted formula plus a streaming LLM call over bundled JSON.
