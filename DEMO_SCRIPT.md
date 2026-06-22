# DriveScore — Walkthrough Voice-Over Script (for the screen recording)

> **This is a voice-over script for a recorded screen walkthrough — not a live meeting.** You're
> narrating to the viewer (the AWS panel) *about* the customers; you are **not** addressing anyone in
> the room. Speak to the camera, describe the two stakeholders in the third person, and narrate what's
> on screen as you click. Read the **quoted lines** aloud; **[bracketed bold]** = the on-screen action.

**What it is:** *DriveScore — a fleet risk & insurance platform.* It turns the telematics a vehicle fleet
already streams into a live risk score and a behaviour-based premium. It helps two parties at once — the
**fleet operator** (safer drivers, lower premium) and the **insurer** (price real risk) — so the
walkthrough shows both sides.

**Length:** ~9:00, inside the 10-min cap. **Arc:** the problem both sides live with → the fleet
operator's view (live) → the insurer's view (live) → "is it real?" → the business case → close.

> **Pre-flight:** full-screen at the deployed URL (or `localhost:5173`), **light theme**, open on **Fleet
> Command**. Clean desktop, notifications off, 1080p. Dry-run the map click, persona switch, and the two
> Rating-Lab slider drags so they're smooth on camera.

---

## 0:00 – 0:50 — The problem both sides live with
**[On screen: Fleet Command, idle — the fleet ride map visible.]**

> "This is DriveScore. It solves one problem that two different businesses each feel from opposite sides —
> so let me set up both, quickly."

> "On one side is a fleet operator — think a Ninja Van, a Grab, a ComfortDelgro — running hundreds of
> vehicles. After fuel, their biggest controllable cost is insurance, and today it's priced off a blunt
> commercial-motor table that can't tell their safest driver from their most dangerous. So good drivers
> subsidise bad ones, and the operator has no lever to lower the bill except 'have fewer accidents and
> hope.'"

> "On the other side is their insurer, pricing that whole fleet as one averaged risk — overcharging the
> safe operators, who leave, and underpricing the dangerous ones, who stay until they become a claim. The
> data that fixes both of those is already streaming off every vehicle, sitting unused in a data lake.
> Here's what it looks like switched on."

---

## 0:50 – 4:00 — The fleet operator's view

### Where the fleet actually drives  (~0:50 – 2:00)
**[Gesture is verbal — the map is already on screen, routes radiating from home bases.]**
> "This is the operator's command view, and this map is their whole fleet — six hundred vehicles — and
> where they actually drove this week. Each driver takes their van home, so every route starts and ends at
> a driver's home base, and the drive home counts too. Green routes are safe; red aren't; the dots are
> real events — hard braking, speeding, night driving — plotted where they happened."

**[Point the cursor to the KPI strip.]**
> "Up top, the headline: a fleet safety score of sixty-three out of a hundred, and two hundred and sixteen
> of the six hundred drivers in the high-risk band — more than a third of the fleet that, today, nobody can
> see until one of them crashes."

**[Move to the insurance-impact panel; click "show how this is calculated".]**
> "And here's what it means in money. On the old flat rate this fleet is billed about eight hundred and
> seventy-three thousand dollars a year. Priced on how the drivers actually drive, it's six hundred and
> sixty-eight thousand — two hundred and four thousand dollars a year lower, just for being measured
> fairly. And it's not a black box — here's that saving, vehicle by vehicle."

**[Point to the coaching-upside line.]**
> "Then the part the operator controls: coach the high-risk drivers up to a safe baseline and the premium
> drops another sixty-three thousand a year. Safety stops being a poster and becomes a line item they can
> move."

### Drilling into one driver  (~2:00 – 3:10)
**[Open the 'Needs coaching' leaderboard; click the worst driver → Driver Detail.]**
> "From the fleet to one driver. This is Marcus, one of the worst, based out of Bukit Batok, with a
> DriveScore of thirty. Here's where he drives — and the red, the hard-braking and night events, jump
> out — and the system says, in plain English, exactly what to coach first."

**[Point to Marcus's Claims history — red 'Risk confirmed by claims', two at-fault claims.]**
> "And this isn't a model's opinion. His claims record shows two at-fault accidents, and the system links
> them straight to the behaviours it flagged — a rear-end tied to hard braking, an intersection collision
> tied to harsh cornering. The model called the risk; the claims confirm it."

### The other end of the book  (~3:10 – 4:00)
**[Persona switch → Sarah. Dashboard re-rates live to the safe tier.]**
> "Now the opposite kind of driver — Sarah, a DriveScore of eighty-six, one of the safest. On a flat fleet
> rate she's invisible; here she's the proof the fleet is getting safer and the reason the premium comes
> down. Coach the Marcuses toward the Sarahs and the whole bill moves."

---

## 4:00 – 5:30 — The insurer's view
**[Switch to the Insurer View — the 'Across the whole fleet' section.]**

> "Same data, the insurer's job: price this fleet correctly instead of as one average. Across the fleet,
> a hundred and ninety-one vehicles are safe but overcharged — those are the customers an insurer loses to
> a competitor — and a hundred and seventeen are risky but underpriced — that's loss leakage they're
> absorbing blind."

**[Click the 'Risky but underpriced' counter → the driver list opens; click a driver → it loads beside the map.]**
> "And these aren't abstractions — tapping the group lists the actual vehicles, worst first, and picking
> one shows its real rating, old rate versus behaviour-based, and its claims, cleanly separated from the
> fleet totals so it's never ambiguous what a number refers to."

**[Point to the KPI strip.]**
> "And the numbers an insurer reports: the claims-cost ratio sits near seventy-six percent today — not
> because the rates are wrong on paper, but because the safe fleets keep lapsing and leaving a riskier
> residual book. Price on behaviour, retain them, and it settles to seventy-two — a near-four-point
> improvement, which in motor is enormous — with retention up six points."

---

## 5:30 – 6:30 — "Is it real?" — break it live
**[Switch to the Rating Lab — five sliders on one vehicle.]**
> "The fair question is whether this is a real engine or a nice animation — so let me try to break it.
> This re-prices a single vehicle live."

**[Drag night-driving to the extreme.]**
> "Push this vehicle to heavy night driving — the score falls, the price re-rates up, live on the backend,
> not a stored number."

**[Let the AI rationale land — it names night driving.]**
> "And the explanation it writes names night driving on its own, because it's reading the real number the
> engine just produced."

**[Drag hard-braking up; the rationale shifts.]**
> "Change my mind — now it's hard braking. The price, the score, and the explanation never disagree, so
> when a driver or a regulator asks why a premium is what it is, the answer is transparent every time."

---

## 6:30 – 8:00 — The business case (both sides win)
**[Back to Fleet Command's insurance-impact panel.]**

> "So the value, in one sentence each. For the fleet operator: a fairer price worth about two hundred
> thousand dollars a year today, plus another sixty-odd thousand they unlock by coaching — funded entirely
> by data they already pay to collect, with no new hardware. For the insurer: they keep the safe fleets
> they were losing, correctly price the risky tail instead of bleeding on it, and move their loss ratio
> four points the right way."

> "And the two aren't in tension — that's the whole idea. The operator gets cheaper insurance by getting
> safer; the insurer gets a better book by rewarding that. Usage-based motor is already table stakes in
> mature markets — Progressive's Snapshot, Discovery's Vitality Drive — and the first insurer to offer
> fleets a fair, behaviour-based price wins the safe operators while the laggards inherit everyone else's
> bad risk."

---

## 8:00 – 9:00 — How it's built, and the close
**[Show the architecture diagram, or stay on the app.]**

> "Under the hood it's a clean AWS stack: a web front end, one transparent pricing engine running
> serverless on AWS Lambda — weighted rules, no black box — and the plain-English explanations come from a
> live model fed the engine's real numbers, so it can never contradict the price. It's serverless, near-
> zero when idle, and it's already deployed and live. Synthetic data throughout — no real records. Built
> in days."

> "So in this short walkthrough, DriveScore took data a fleet already owns and turned it into three things:
> a fairer, lower premium the operator can actively lower by coaching; an early-warning view that prices
> risk before it becomes a claim; and, for the insurer, a loss ratio and a retention number that both move
> the right way. The data is already there — the only question is whether it gets activated. That's
> DriveScore."

**[Hold on the impact panel for a beat, then stop recording.]**

---

## Click-cue cheat sheet
1. **Open** on Fleet Command, light theme — ride map is the backdrop for the 0:00 narration.
2. **Fleet Command:** map → KPI strip (score 63, 216 high-risk) → insurance impact (S$873k → S$668k = **S$204k/yr**) → "show how this is calculated" → coaching upside **S$63k/yr**.
3. **Leaderboard → worst driver → Driver Detail (Marcus, Bukit Batok):** trip map → factors → **Claims (red 'Risk confirmed')**.
4. **Persona switch → Sarah:** re-rates live (score 86, safe).
5. **Insurer View:** counters (**191** / **117**) → click 'Risky but underpriced' → driver list → click a driver → 'Selected vehicle' beside the map → KPI strip (75.8→72.0%, +6.2pp).
6. **Rating Lab:** drag night-driving → AI names it → drag hard-braking → AI re-names it.
7. **Architecture + close** on the impact panel. Record in **light theme**.

## Numbers cheat sheet (verified live — should match screen)
- **Fleet (Ninja Logistics, insured by Etiqa):** **600** vehicles · avg **63** · **216** high-risk · premium **S$668,544** vs **S$872,724** old flat rate = **S$204,180/yr saved** · coaching upside **S$62,636/yr**.
- **Marcus (D0002):** score **30**, Bukit Batok · 2 at-fault claims → "Risk confirmed." **Sarah (D0001):** score **86** → "Low risk confirmed." **Priya (D0003):** **67**.
- **Insurer View:** **191** safe-but-overcharged · **117** risky-but-underpriced · claims-cost ratio **75.8% → 72.0%** · retained **+6.2pp**.

## Delivery notes — it's a recorded voice-over, not a live pitch
- **Narrate to the viewer, in the third person about the customers** — never "you, the CEO." There's no one in the room to address or point at.
- **Let the map and the money land** — pause a beat on the S$204k saving and on the Rating-Lab re-rate; those are the "obvious why it matters" moments.
- **Numbers carry it.** Every figure is on screen; say it as you show it.
- If the live AI lags, the grounded fallback streams — never stalls; don't mention it.
- Record **first and last 30 seconds** until they're clean. Hard cap **10:00**; aim **~9:00**.
