# DriveScore — Executive Pitch & Walkthrough (read-through)

> **⚠️ The walkthrough recording itself is a human task.** This script is the read-through for the
> 5–10 min screen-and-voice recording, but recording the screen with a voice-over has to be done by a
> person — an agent can't capture screen + audio. Everything below is ready to read aloud against the
> live app; produce the recording from it.

**The pitch, not a feature tour — and it has *two* audiences.** You are an AWS Innovation Hub engineer
presenting *DriveScore — a fleet risk & insurance platform*. Two decision-makers are in the room, and
the product solves a problem they share from opposite sides:

- **The Fleet CEO** — *Ninja Logistics* (a Singapore last-mile fleet; synthetic, standing in for the
  ComfortDelgro / Grab / Ninja Van kind of operator). They run ~600 vehicles and want **safer drivers
  and a lower insurance bill.**
- **The Insurer owner** — *Etiqa*, who underwrites that fleet's commercial motor cover and wants to
  **price real risk instead of a blunt table.**

DriveScore turns the telematics the fleet already streams into a live risk score, and it makes both
people win: the operator coaches its way to a cheaper premium; the insurer stops overcharging the safe
and underpricing the risky. The live demo is the **proof** inside the pitch.

**Length:** ~9:00 spoken, inside the 10-min cap. **Arc:** the shared problem → pitch to the Fleet CEO
(live) → pitch to the Insurer owner (live) → "is it real?" → the business case for both → why now / ask.

**How to use this:** read the quoted lines aloud, unhurried. **[Bracketed bold]** = what to click. The
numbers are the actual seeded values and will match the screen.

> **Pre-flight:** backend `:8000`, frontend `:5173`, full-screen at http://localhost:5173/, open on
> **Fleet Command**. Clean desktop, notifications off, 1080p, **light theme**. Dry-run the map click,
> the persona switch, and the two slider drags in the Rating Lab.

---

## 0:00 – 0:50 — The shared problem (why both people are losing)
**[On screen: Fleet Command, idle — the fleet ride map visible. Don't touch anything yet.]**

> "Thanks for the time. There are two of you here, and that's deliberate — because you're on opposite
> sides of the same broken deal, and it's costing you both."

> "You" — *to the Fleet CEO* — "run hundreds of vehicles. Your single biggest controllable cost after
> fuel is insurance, and right now you pay a premium set off a blunt commercial-motor table. It can't
> tell your safest driver from your most dangerous one, so your good drivers subsidise your bad ones,
> and you have no lever to lower the bill except 'have fewer accidents and hope.'"

> "And you" — *to the Insurer* — "are pricing that whole fleet as one averaged risk. So you overcharge
> the safe operators — who leave — and underprice the dangerous ones — who stay, until they're a claim.
> You're losing the fleets you want and keeping the ones you don't."

> "The data that fixes both of those is *already being collected* — every vehicle streams speed,
> braking, time of day. It's sitting in a data lake, untouched. So this isn't a data problem, it's an
> activation problem. Let me switch it on — on your fleet."

---

## 0:50 – 4:00 — Pitch to the Fleet CEO (the operator's view)

### Your whole fleet, where it actually drives  (~0:50 – 2:00)
**[Fleet Command. Gesture across the map — routes radiating from home bases across Singapore.]**
> "This is your fleet — six hundred vehicles — and this is where they actually drove this week. Each
> driver takes their van home and parks it, so every route starts and ends at a driver's home base, and
> the drive home counts too. Green routes are safe; red routes aren't. The dots are real events —
> hard braking, speeding, night driving — plotted where they happened."

**[Point to the KPI strip.]**
> "Up here is the headline. Fleet safety score: sixty-three out of a hundred. Two hundred and sixteen
> of your six hundred drivers are in the high-risk band — that's more than a third of your fleet, and
> today you can't see who they are until one of them has an accident."

**[Point to the insurance-impact panel, then the 'Show how this is calculated' link.]**
> "And here's what it means in money. On the old flat rate, this fleet is billed about eight hundred
> and seventy-three thousand dollars a year. Priced on how your drivers *actually* drive, it's six
> hundred and sixty-eight thousand — **two hundred and four thousand dollars a year lower**, today,
> just for being measured fairly." **[Click 'Show how this is calculated'.]** "And it's not a black
> box — here's the math, vehicle by vehicle."

**[Point to the coaching-upside line.]**
> "Then there's the part you control. If you coach your high-risk drivers up to a safe baseline, the
> premium drops another sixty-three thousand a year. For the first time, safety isn't just a slogan on
> a poster — it's a line item you can move."

### Drill into the driver who's costing you  (~2:00 – 3:10)
**[Open the 'Needs coaching' leaderboard, click the worst driver — opens Driver Detail (Marcus).]**
> "Let's go from the fleet to one driver. This is Marcus — one of your worst, based at Bukit Batok.
> His DriveScore is thirty."

**[Point to his trip map, then the factor breakdown.]**
> "Here's where *he* drives — and the red, the hard-braking and night-driving events, jump out. The
> system tells you in plain English exactly what's dragging his score down and what to coach first."

**[Point to Marcus's Claims history — red 'Risk confirmed by claims' banner, two at-fault claims.]**
> "And this isn't a model's opinion. Here's his claims record: two at-fault accidents — and the system
> links them straight to the behaviours it flagged. A rear-end collision tied to hard braking; an
> intersection collision tied to harsh cornering. The model called the risk; your own claims confirm
> it. *That's* the driver to put on a coaching plan on Monday — and the premium follows."

### The flip side — your best driver  (~3:10 – 4:00)
**[Persona switch → Sarah. Dashboard re-rates live: score up, 'safe' tier.]**
> "Now the opposite. Sarah — DriveScore eighty-six, one of your safest. On a flat fleet rate she's
> invisible; here she's the proof your fleet is getting safer, and the reason your premium is coming
> down. Coach the Marcuses toward Sarah and the whole bill moves."

---

## 4:00 – 5:30 — Pitch to the Insurer owner (the underwriting view)

**[Switch to the Insurer View — the 'Across the whole fleet' section first.]**
> "Now to you" — *to the Insurer*. "Same data, your job: price this fleet correctly. Today you'd quote
> it as one averaged risk. Watch what you can see instead."

**[Point to the two mispriced counters.]**
> "Across the fleet, a hundred and ninety-one vehicles are *safe but overcharged* — those are the
> drivers, and the fleets, you lose to a competitor. A hundred and seventeen are *risky but
> underpriced* — that's loss leakage you're absorbing without seeing it."

**[Click the 'Risky but underpriced' counter — the driver list opens.]**
> "And these aren't abstractions. Tap the group and you get the actual vehicles, worst first." **[Click
> a driver → it loads into 'Selected vehicle' beside the map.]** "Pick one and you see its real rating,
> old rate versus behaviour-based, and its claims — one vehicle at a time, cleanly separated from the
> fleet totals so you always know what you're looking at."

**[Point to the KPI strip.]**
> "And here's what it does to the numbers you report. Claims cost ratio today sits near seventy-six
> percent — not because your rates are wrong on paper, but because the safe fleets keep lapsing and
> leaving you a riskier residual book. Price on behaviour and retain them, and it settles to seventy-two
> — a near-four-point improvement. In motor, four points is enormous. Drivers retained, up six points."

---

## 5:30 – 6:30 — "Is this real?" — break it live
**[Switch to the Rating Lab — five sliders on one vehicle.]**
> "Fair question from both of you: is this a real engine, or a nice animation? Let's try to break it.
> This re-prices a single vehicle live. Pick any behaviour."

**[Drag night-driving to the extreme.]**
> "I'll push this vehicle to heavy night driving."

**[Score drops, premium re-rates, factor bars re-rank, AI rationale re-streams.]**
> "The score fell, the price re-rated up — live on the backend, not a stored number. And the
> explanation it's writing—" **[let the AI text land — it names night driving]** "—named night driving
> on its own, because it's reading the real number the engine just produced. Let me change my mind—"

**[Drag hard-braking up; the rationale shifts to hard-braking.]**
> "—now it's hard braking. The price, the score, and the explanation never disagree. That matters to
> both of you: when a driver, a fleet manager, or a regulator asks *why* a premium is what it is, the
> answer is transparent every single time."

---

## 6:30 – 8:00 — The business case (both sides win)
**[Back to Fleet Command's insurance-impact panel, or the Insurer View KPIs.]**

> "So let's talk money, because that's the only language this gets decided in — and the point is it's
> the *same* money, working for both of you."

> "For the fleet: a fair price today worth about two hundred thousand dollars a year, plus another
> sixty-odd thousand you unlock by coaching — funded entirely by data you already pay to collect. No
> new hardware, no new data cost."

> "For the insurer: you keep the safe fleets you were losing, you price the risky tail correctly
> instead of bleeding on it, and your loss ratio moves four points the right way. You're not cutting
> price — you're *aiming* it."

> "And these two aren't in tension — that's the whole idea. The operator gets cheaper insurance *by
> getting safer*; the insurer gets a better book *by rewarding that*. Usage-based motor is already
> table stakes in mature markets — Progressive's Snapshot, Discovery's Vitality Drive. The first
> insurer to offer fleets a fair, behaviour-based price wins the safe operators; the laggards inherit
> everyone else's bad risk. The window is open now."

---

## 8:00 – 9:00 — Why it's low-risk to build + the ask
**[Architecture diagram, or stay on the app.]**

> "What does it take, and how risky is it to build? Less than you'd expect — that's why I'm showing you
> a *working* system, not slides. A web front end, one transparent pricing engine running serverless on
> AWS Lambda — weighted rules, no black box you can't defend — and the plain-English explanations come
> from a live model that's *fed the engine's real numbers*, so it can never contradict your price. It's
> serverless, near-zero when idle, scales to the whole fleet, and runs on synthetic data here — no real
> records, no privacy exposure. We built this proof in days."

> "So here's the ask. Let us run this against a slice of your *real* fleet and its *real* claims, in a
> focused pilot. The fleet sees its actual risky drivers and a hard projection of the premium it can
> unlock by coaching; the insurer sees the actual mispriced book and the loss-ratio impact — your
> numbers, not mine. You already own the data. The only question is whether you activate it together —
> or wait for a competitor to do it for your drivers. That's DriveScore. Let's scope the pilot."

**[Hold on the impact panel for a beat, then stop recording.]**

---

## Click-cue cheat sheet
1. **Open** on **Fleet Command** — don't interact during the 0:00 problem framing; the ride map is the backdrop.
2. **Fleet Command:** map (routes from home bases) → KPI strip (score 63, 216 high-risk) → insurance impact (S$873k static → S$668k behaviour = **S$204k/yr** saved) → **'Show how this is calculated'** → coaching upside **S$63k/yr**.
3. **Leaderboard → worst driver → Driver Detail (Marcus, Bukit Batok):** trip map → factor breakdown → **Claims (red 'Risk confirmed', 2 at-fault → hard braking + harsh cornering)**.
4. **Persona switch → Sarah:** dashboard re-rates live (score 86, safe).
5. **Insurer View:** 'Across the whole fleet' → counters (**191** overcharged-safe · **117** underpriced-risky) → **click 'Risky but underpriced'** → driver list → **click a driver** → it loads into 'Selected vehicle' beside the map → KPI strip (claims-cost ratio 75.8→72.0%, retained +6.2pp).
6. **Rating Lab:** drag **night-driving** to extreme → let AI name it → drag **hard-braking** → let AI re-name it.
7. **Business case + architecture:** narrate on the impact panel / KPIs.
8. **Close:** impact panel up — deliver the pilot ask, hold, stop. **Record in light theme.**

## Numbers cheat sheet (verified live — should match screen)
- **Fleet (Ninja Logistics, insured by Etiqa):** **600** vehicles · avg DriveScore **63** · **216** high-risk (>⅓) · annual premium **S$668,544** behaviour-based vs **S$872,724** old flat rate = **S$204,180/yr saved** · coaching upside **S$62,636/yr**.
- **Marcus (D0002):** DriveScore **30**, home base **Bukit Batok**, top factor hard braking · Claims **2 at-fault** (rear-end → hard braking; intersection → harsh cornering) → red "Risk confirmed by claims."
- **Sarah (D0001):** DriveScore **86**, safe tier · Claims **0** → green "Low risk confirmed."
- **Priya (D0003):** DriveScore **67**, moderate · top factor average speed.
- **Insurer View (book modelled to 50k):** **191** safe-but-overcharged · **117** risky-but-underpriced · claims-cost ratio **75.8% → 72.0%** (−3.8pp) · drivers retained **+6.2pp**.
- **Rating Lab (single vehicle what-if):** push **night driving** to the rail → score drops, premium re-rates up, AI names night driving; drag **hard braking** up → AI re-names it.

## Delivery notes — this is a pitch, perform it like one
- **Address both people.** Say "to the fleet…" / "to the insurer…" out loud so the two-audience structure is unmistakable. Every metric ties to *their* money.
- **The map is the opener.** Don't narrate features — let the fleet-wide ride map land first; it's the "this is real, and it's *your* fleet" moment.
- **Stakes early, ask late.** Open on the shared cost of inaction; close on a concrete joint pilot.
- **Confidence on the "break it" beat** — invite the doubt, then prove it. That moment sells the engine.
- Architecture is reassurance ("low-risk, fast, defensible"), not a tech lecture — keep it short.
- If the live AI lags on the day, the grounded fallback streams instead — never stalls; don't mention unless asked.
- Hard cap **10:00**; aim for **~9:00**. Rehearse the **first and last 30 seconds** until automatic.
