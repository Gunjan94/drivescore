# DriveScore — Fleet Risk & Insurance Platform

## One-line pitch
DriveScore turns the telematics a vehicle **fleet** already streams into live, explainable,
behaviour-based risk scores and commercial-motor premiums — so the **fleet operator** can see where its
risk is, coach it down, and cut its insurance bill, while the **insurer** prices real behaviour instead
of a blunt table.

## Two stakeholders (who it's for and how it helps each)
- **Fleet operator CEO** — synthetic **"Ninja Logistics"** (Ninja Van's parent entity; standing in for
  Singapore last-mile / ride-hail operators like ComfortDelgro, Grab, Ninja Van). Runs ~600 vehicles.
  Wants safer drivers and a lower insurance bill.
- **Insurer owner** — **"Etiqa"**, underwrites the fleet's commercial motor cover. Wants to price the
  fleet on real risk, keeping the safe operators and correctly pricing the dangerous ones.

> Company names are illustrative for the demo; **all data is synthetic** — no real Ninja Van or Etiqa
> data. Money is **SGD, annualised**.

## The customer problem
A large fleet's insurance is priced off a **static commercial-motor table** (vehicle class, etc.) — it
can't tell the safest driver from the most dangerous, so good drivers subsidise bad ones and the
operator has no lever to lower the bill. From the insurer's side, the fleet is priced as one averaged
risk: **safe operators are overcharged → they leave; risky ones are underpriced → they become claims.**
Every vehicle already streams speed, hard-braking, time of day, mileage, harsh cornering — and it sits
**unused in a data lake.** This is an activation problem, not a data problem.

## The concept — four views, two audiences, one story

### 1. Fleet Command (Fleet CEO — default)
The operator's home screen.
- **Fleet ride map (hero)** — a live Singapore map of recent trips across the fleet; routes coloured by
  safety, safety events plotted, and each driver's **home base** marked (drivers take vehicles home, so
  every trip starts/ends there — the drive home is a fleet ride too).
- **KPI strip** — vehicles, fleet safety score, at-risk drivers, annual premium, **saved vs old flat
  rate**.
- **Driver safety leaderboard** — worst/safest toggle; click a driver → Driver Detail.
- **Insurance impact** — old flat-rate bill vs behaviour-based vs coached, with a **"show how this is
  calculated"** drill-down (the saving, vehicle by vehicle).

### 2. Driver Detail (drill-down)
One driver/vehicle: their **trips on a map** (home base shown), DriveScore + tier, factor breakdown,
premium build-up (SGD, NCD), **claims history** (the validation beat, below), and live AI coaching.

### 3. Insurer View (Insurer owner)
The underwriting console, split for clarity:
- **Across the whole fleet** — two **clickable** mispriced counters (*safe but overcharged* / *risky
  but underpriced*) that open the actual driver lists; plus loss ratio (computed before/after) and
  retention. These totals don't change when you select a vehicle.
- **Inspect one vehicle** — the risk-vs-price map beside the **selected vehicle's** pricing (old rate vs
  DriveScore, over/under amount, claims), with a drill into Driver Detail.

### 4. Rating Lab (shared — the proof)
Five telematics sliders on a single vehicle → **DriveScore and premium re-rate live** on the backend,
factor bars re-rank, and the AI rationale re-streams naming the dominant factor. The "is it real?" beat.

## Claims history — the validation beat
Claims are ground truth, so the prototype uses them to **prove the DriveScore is right**, not just
plausible:
- **Sarah (safe, 86):** 0 claims → green **"Low risk confirmed"** — genuinely low-risk, currently
  overcharged by the flat rate.
- **Marcus (risky, 30, home base Bukit Batok):** 2 **at-fault** claims, each linked to the exact factor
  the model flagged (rear-end → hard braking; intersection → harsh cornering) → red **"Risk confirmed
  by claims."**
- **Priya (avg, 67):** 1 not-at-fault claim → neutral "Matches the DriveScore."

The line this enables: *"The model didn't guess — your own claims confirm it called the risk."*

## The hero demo moments
1. **Fleet Command map** — "here's where your 600 vehicles actually drove this week," routes coloured by
   safety, home bases marked. The "this is real, and it's *your* fleet" moment.
2. **Insurance impact** — old flat rate **S$872,724/yr** → behaviour-based **S$668,544/yr** = **S$204,180
   saved**, with the calculation shown; +**S$62,636/yr** more by coaching the high-risk tail.
3. **Insurer counters → list** — click *risky but underpriced* → the actual vehicles → select one → its
   pricing beside the map.
4. **Rating Lab break-it** — drag night-driving to the extreme; price re-rates and the AI names night
   driving unscripted; drag hard-braking → it re-names it.

"5 out of 5" = *I'd put this in front of a customer CEO tomorrow, unedited.*

## The "real backend" proof
The load-bearing proof is the **slider → recompute** round trip and the **/fleet/summary** &
**/portfolio** aggregates — changing an input changes the output, computed server-side by a transparent
**weighted-rules risk engine** that returns per-factor contributions (explainability is the feature).
Dynamic pricing = **base rate × risk multiplier**, always shown as a **delta vs the old flat-rate
baseline**. The fleet ride map is built from a deterministic geo engine grounded in each driver's real
telematics, so the map and the score always tell one story.

## Demo narrative
> "Two of you are here — the fleet CEO and the insurer — because you're on opposite sides of the same
> broken deal. Here's where your 600 vehicles actually drive. A third of your drivers are high-risk and
> you can't see them until they crash. Priced on real behaviour, your bill drops S$204k a year today —
> and another S$63k if you coach the worst. For the insurer: 191 vehicles overcharged, 117 underpriced,
> and your loss ratio moves four points the right way. Watch us prove it — live."

The full two-audience CEO pitch lives in **`DEMO_SCRIPT.md`**; this is the concept summary.

## Feature → scored-criteria map

| Feature | Scored criterion it proves | Demo-path? | Bar |
|---|---|---|---|
| Slider → `/score` + `/price` live recompute (Rating Lab) | 1. Working backend | **Demo-path** | 5 — the "it's real" proof |
| Weighted-rules engine returns per-factor contributions | 1. Real processing; 2. Tech integration | **Demo-path** | 5 |
| **Fleet ride map** (`/fleet/trips`, Leaflet, home bases) | 2. Tech integration; 3. UI polish; 4. Impact | **Demo-path** | 5 — the hero upgrade |
| `/fleet/summary` KPIs + insurance impact + calc drill-down | 1. Backend; 4. Business impact | **Demo-path** | 5 |
| `/explain` → live LLM streaming coaching, grounded | 2. Tech integration; 3. UI polish | **Demo-path** | 5; template/cache fallback |
| Driver Detail (score, trips map, factors, claims, coaching) | 3. UI/UX polish; 4. Impact | **Demo-path** | 5 |
| Insurer View — whole-fleet vs selected + clickable counters→list | 4. Business impact clarity | **Demo-path** | 5 |
| Loss ratio computed before/after (adverse selection) | 1. Real backend; 4. Impact | **Demo-path** | 5 |
| Two-audience narrative arc (Fleet CEO → Insurer → prove it) | 5. Executive presence | **Demo-path** | 5 |
| `/portfolio` over 600 synthetic drivers | 1. Real backend; 2. Data | **Demo-path** | 5 (drives the console) |
| Responsive (mobile nav, fluid type, responsive map/chart) | 3. UI/UX polish | **Demo-path** | 5 |
| CDK one-command deploy + clone-to-run README | 1. Clone-to-run | **Demo-path** | 5 |
| Optional scikit-learn model behind the rules engine | 2. Tech integration (bonus) | Off-path | Rough edges OK |
| Auth, multi-user, persistence, account screens | — (anti-criteria) | Off-path | Do NOT build |

## Explicit non-goals (anti-criteria)
Production-grade code, tests, CI/CD, multi-env, monitoring infra, exhaustive edge-case handling, a
"finished product," docs beyond the four deliverables. Synthetic data only — no real customer data, no
secrets in the repo.

## Top risk + mitigation
**Risk:** the DriveScore feels arbitrary ("why 30?"). **Mitigation:** explainability is built into the
engine — every score ships with its per-factor contributions, the UI shows them, the AI reads from them,
and the fleet map + claims corroborate them. Overall build risk **LOW**: a deterministic weighted
formula + a geo engine + a streaming LLM over bundled JSON.
