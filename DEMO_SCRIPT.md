# DriveScore — Executive Pitch & Walkthrough (read-through)

**The pitch, not a feature tour.** You are an AWS Innovation Hub engineer presenting to the
**CEO of a regional motor insurer** who is visiting the Hub. The prototype — *Meridian Motor ·
DriveScore*, usage-based motor insurance in Singapore (SGD) — is the **proof** inside the pitch.
Every line is spoken *to that CEO*, about *their* business: their churn, their loss ratio, their
board. The live demo exists to prove the claim is real, not to show off screens.

**Length:** ~8:30 spoken, inside the 10-min cap. **Arc:** their problem → the stakes → the idea →
live proof → the business case → why now / the ask.

**How to use this:** read the quoted lines aloud, unhurried. **[Bracketed bold]** = what to click.
The numbers below are the actual seeded values — they will match the screen.

> **Pre-flight:** backend `:8000`, frontend `:5173`, full-screen at http://localhost:5173/, open on
> the **Driver Dashboard**. Clean desktop, notifications off, 1080p. Dry-run the two slider drags.

---

## 0:00 – 0:50 — Open in *their* world (the cost of doing nothing)
**[On screen: Driver Dashboard, Sarah's view, idle. Don't touch anything.]**

> "Thanks for the time. Before I show you anything, let me describe a problem I think you already
> live with — and what it's quietly costing you."

> "Right now, you price motor policies off a static table: age, postcode, vehicle. Everyone in the
> same bracket pays the same. Which means two things are happening in your book at all times. Your
> *safest* drivers are being overcharged — so they shop around and leave. And your *riskiest*
> drivers are being underpriced — so you keep them, right up until they become a claim. You're
> losing the customers you want and subsidising the ones you don't."

> "And here's the part that should sting: the data that would fix both of those is *already yours*.
> You're collecting telematics today — speed, braking, time of day — and it's sitting in a data
> lake, untouched. So this isn't a data problem. It's an activation problem. Let me show you what it
> looks like when you switch it on. We built this on your scenario in a few days."

---

## 0:50 – 4:30 — The proof: a live, working system

### Meet your best customer — and what you're doing to her  (~0:50 – 2:10)
**[Point to the DriveScore gauge: 91, "Platinum driver".]**
> "This is Sarah — one of your customers. Her DriveScore is eighty-six out of a hundred, calculated
> from how she actually drives over the last ninety days. She's genuinely one of the safest drivers
> on your book."

**[Point to the policy card — NCD 50%, Comprehensive, policy number.]**
> "She's also exactly who you can't afford to lose: comprehensive cover, No-Claims Discount maxed at
> fifty percent, loyal, never claimed. And yet—"

**[Move to the premium build-up panel — read it down.]**
> "—under your static table she's *overpaying*. Watch how DriveScore prices her instead, in the
> open: base premium for her car, then a safe-driving discount she earned, then her No-Claims
> Discount. She lands about four hundred and twenty dollars a year below your standard rate — roughly
> thirty-five dollars a month. That's not a giveaway. That's the price her risk actually justifies —
> and it's the difference between Sarah renewing with you and Sarah leaving for the competitor who
> *does* offer this."

**[Point to the recent-trips feed, then the streaming AI coach.]**
> "She sees exactly why — every trip scored, every event flagged — and the system coaches her, in
> plain English, generated live, on how to save even more. That's a customer who now has a *reason*
> to stay and a *reason* to drive more safely. Your loss ratio thanks her twice."

**[Point to the Claims history panel — green 'Low risk confirmed' banner, 5 claim-free years.]**
> "And this isn't just a model's opinion. Here's your own claims record for Sarah: five years,
> not a single claim. Your data already *agrees* she's low-risk — and you're still overcharging her.
> That's the gap DriveScore closes."

### The other side of your book — switch to Marcus  (~2:00 – 2:45)
**[Use the persona switcher at the top — click "Marcus Reid · Risky · underpriced."]**
> "Now let me show you the customer you *don't* see today. Same app, different driver — Marcus."

**[The whole dashboard re-rates live: score drops to the watch tier, premium flips to a surcharge.]**
> "His DriveScore is thirty. The behaviour is all there — frequent hard braking and aggressive
> cornering — and the system is telling you he's underpriced on your static table."

**[Point to Marcus's Claims history — red 'Risk confirmed by claims' banner, two at-fault claims.]**
> "But here's the part that should stop you. Look at his claims: two at-fault accidents — and the
> system links them straight back to the exact behaviours it flagged. A rear-end collision tied to
> hard braking; an intersection collision tied to harsh cornering. The model didn't guess. Your own
> claims history *confirms* it called the risk — and the static table charged him as if none of it
> happened. That's the loss leakage, with a name and a face."

### "Is this real?" — break it live  (~2:45 – 3:45)
**[Switch to the "Live Rating Engine" tab — five sliders, a riskier applicant.]**
> "So is this a real engine, or a nice animation? Let's not pretend — let's try to break it. This is
> your underwriter's live rating workbench, quoting a fresh applicant. Pick any behaviour."

**[Drag night-driving hard to the extreme.]**
> "I'll push this driver to heavy night driving."

**[Score drops, premium re-rates, factor bars re-rank, AI rationale re-streams.]**
> "The score fell, the premium re-rated up — live, on the backend, not a stored number. And the
> rationale it's writing—"

**[Let the AI text land — it names night-driving, unscripted.]**
> "—it named night-driving as the top factor on its own, because it's reading the real number the
> engine just produced. Let me change my mind—"

**[Drag hard-braking up; the rationale shifts to hard-braking.]**
> "—now it's hard-braking. The price, the score, and the explanation never disagree. That matters to
> you for one specific reason: when a regulator or a customer asks *why* a premium is what it is, you
> have a defensible, transparent answer every single time."

### Your whole book, on one screen  (~3:30 – 4:30)
**[Switch to the Underwriter Console — KPI strip, mispricing map.]**
> "One driver is a story. Here's your *business* — a fifty-thousand-policy book. Every dot is a
> customer: their real risk against what they pay you today."

**[Point top-left, then bottom-right.]**
> "Top-left: safe drivers you're overcharging — a hundred and ninety of them — that's your churn,
> already in motion. Bottom-right: risky drivers you're underpricing — that's loss leakage you can't
> see today. For the first time, both are *named*, before they cost you."

**[Point to the KPI strip.]**
> "And here's what it does to the numbers your board watches. Your loss ratio today sits near
> seventy-six percent — not because your rates are wrong on paper, but because your best drivers keep
> lapsing and leaving you a riskier residual book. Retain them and it settles to seventy-two — a
> near-four-point improvement in your loss ratio. In motor, four points is enormous. Retention up six
> points. That's not a feature — that's your combined ratio moving."

---

## 4:30 – 6:00 — The business case (speak to the P&L)
**[Stay on the Underwriter Console / repricing-impact panel.]**

> "So let's talk money, because that's the only language this decision is made in. On a book this
> size, the model projects retention up six points — that's your best customers, like Sarah, staying
> instead of leaving — and roughly three and a half million dollars a year in loss leakage recovered,
> from finally pricing the risky tail correctly."

> "Those two levers — keep the good, correctly price the bad — are exactly the two halves of an
> underwriting loss. And you fund all of it with data you *already own and already pay to collect*.
> There's no new data acquisition cost. The asset is just sitting there unused."

> "And this isn't speculative. Progressive built a multi-billion-dollar book on exactly this with
> Snapshot; Discovery's Vitality Drive is already live across this region. Usage-based motor is table
> stakes in mature markets and it's coming here fast. The insurer who offers a fair, transparent,
> behaviour-based
> price wins the safe drivers — and the laggards inherit everyone else's bad risk. This is a window,
> and it's open now."

---

## 6:00 – 7:15 — Why it's low-risk to do (architecture, framed for a CEO)
**[Show the architecture diagram, or stay on the app.]**

> "Your fair question is: what does it take, and how risky is it to build? The honest answer is —
> far less than you'd expect, and that's the point of showing you a *working* system, not slides."

> "It's a clean, modern stack on AWS. A web front end your customers and underwriters use, a single
> piece of pricing logic running serverless on AWS Lambda — a transparent, weighted-rules engine, so
> nothing about your pricing is a black box you can't defend. The plain-English explanations come
> from Claude on Amazon Bedrock, and — this is the important design choice — the AI is fed the
> engine's real numbers, so it can never contradict your actual price. That's what makes it safe to
> put in front of a customer or a regulator."

> "It's serverless, so it costs almost nothing when idle and scales to your whole book without a data
> centre. It runs entirely on synthetic data here — no real customer records, no privacy exposure in
> the prototype. And we built this proof in days, not quarters. With AWS and the Innovation Hub, you
> can pilot this on a slice of your real book within weeks."

---

## 7:15 – 8:15 — Close + the ask
**[Return to the repricing-impact panel — leave the business outcome on screen.]**

> "So here's what we've actually done in this short time. We took data you already had and turned it
> into three things: a fair price and a clear reason for Sarah, so she stays. An early-warning system
> for your underwriters, so risk is priced before it becomes a claim. And two numbers your board
> moves on — retention, and loss ratio."

> "What I'd propose is simple: let us run this against a sample of your *real* book in a focused
> pilot. You'll see your actual Sarahs, your actual underpriced risk, and a hard projection of the
> retention and loss-ratio impact on your numbers — not mine. If the pilot says what this prototype
> says, you'll have the business case to roll it out."

> "You already own the data. The only question is whether you'd rather activate it — or watch a
> competitor do it for your customers. That's DriveScore. I'd love to scope the pilot with your team."

**[Hold on the impact panel for a beat, then stop recording.]**

---

## Click-cue cheat sheet
1. **Open** on Driver Dashboard (Sarah) — do *not* interact during the 0:00 problem framing.
2. **Dashboard (Sarah):** gauge (91, Platinum) → policy card (NCD 50%) → premium build-up (−S$420/yr) → trips → live coach → **Claims (green 'Low risk confirmed', 5 claim-free yrs)**.
3. **Persona switch → Marcus:** dashboard re-rates live (score 30, surcharge) → **Claims (red 'Risk confirmed', 2 at-fault, linked to hard braking + harsh cornering)**.
4. **Live Rating Engine:** drag **night-driving** to extreme → let AI name it → drag **hard-braking** → let AI re-name it. *(This is a fresh applicant, not one of the three personas.)*
5. **Underwriter Console:** top-left cluster → bottom-right cluster → KPI strip (loss ratio 75.8→72.0%, retention +6.2pp) → optionally click Marcus's dot to show his claims in the inspect panel.
6. **Business case + architecture:** stay on Console / impact panel while narrating.
7. **Close:** repricing-impact panel up — deliver the pilot ask, hold, stop.
8. **(Optional) Theme:** sun/moon button top-right toggles light/dark — record in **light** for a clean exec look.

## Numbers cheat sheet (verified live — should match screen)
- **Sarah (D0001):** DriveScore **86**, Platinum, NCD 50%. Dominant factor: **mileage** (a safe, high-mileage commuter — nothing else flagged). ~**S$35/mo** (~**S$420/yr**) below the static table. Claims: **0**, **5 claim-free years** → green "Low risk confirmed."
- **Marcus (D0002):** DriveScore **30**, surcharge vs static. Dominant factor: **hard braking** (aggressive city driver). Claims: **2 at-fault** (rear-end → hard braking; intersection → harsh cornering) → red "Risk confirmed by claims."
- **Priya (D0003):** DriveScore **67**, moderate · mildly overpaying. Dominant factor: **average speed** (fast highway commuter). Claims: **1 not-at-fault** (windscreen) → neutral "Consistent with DriveScore."
- **Fresh applicant (rating engine):** push **night-driving** to the rail → score drops, premium re-rates up, AI names night driving (it carries the heaviest weight, so it dominates when maxed); then drag **hard-braking** up → AI re-names it. Demonstrates the engine + AI on a separate applicant.
- **Three distinct stories:** Sarah = safe/overcharged (mileage) · Priya = average/overpaying (speed) · Marcus = risky/underpriced (hard braking). No two personas share a top factor.
- **Book (50k modelled):** **191** overcharged-safe · **117** underpriced-risky · loss ratio **75.8% → 72.0%** (−3.8pp, computed from adverse selection) · retention **+6.2pp** · **~S$3.5M/yr** loss leakage recovered.

## Delivery notes — this is a pitch, perform it like one
- **Talk to the CEO, not the screen.** Every metric ties back to *their* money: churn, loss ratio, combined ratio, the competitor.
- **Stakes early, ask late.** Open on the cost of inaction; close on a concrete pilot, not "thanks for watching."
- **Confidence on the "break it" beat** — you *want* them to doubt it, then you prove it. That moment sells the whole thing.
- Architecture is reassurance ("low-risk, fast, defensible"), not a tech lecture. Keep it short.
- If Bedrock lags on the day, the grounded cached explanation streams instead — never stalls; don't mention unless asked.
- Hard cap **10:00**; aim for **~8:15** to keep buffer. Rehearse the **first and last 30 seconds** until they're automatic.
