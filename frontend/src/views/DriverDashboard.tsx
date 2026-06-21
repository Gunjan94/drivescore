import { useEffect, useMemo, useRef, useState } from "react";
import { getDriver, getPrice, streamExplain, type DriverRow, type PriceResult } from "../api";
import { Gauge } from "../components/Gauge";
import { FactorBars } from "../components/FactorBar";
import { StreamingText } from "../components/StreamingText";
import { PolicyCard } from "../components/PolicyCard";
import { RatingBreakdown } from "../components/RatingBreakdown";
import { TripList } from "../components/TripList";
import { ClaimsHistory } from "../components/ClaimsHistory";
import { PersonaSwitcher } from "../components/PersonaSwitcher";
import { policyFor, premiumView, tierFor } from "../domain";
import { recentTrips } from "../trips";
import { theme } from "../theme";

// The dashboard opens on Sarah (D0001) — the protagonist — and can switch to
// Marcus (risky/underpriced) and Priya (average) to tell the full narrative.
export function DriverDashboard({ driverId: initialId = "D0001" }: { driverId?: string }) {
  const [driverId, setDriverId] = useState(initialId);
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [price, setPrice] = useState<PriceResult | null>(null);
  const [explainText, setExplainText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await getDriver(driverId);
      if (!alive) return;
      setDriver(d);
      const p = await getPrice(d.telematics, {
        age: d.age,
        postcode: d.postcode,
        vehicle_class: d.vehicle_class,
      });
      if (!alive) return;
      setPrice(p);
      cancelRef.current?.();
      setExplainText("");
      setStreaming(true);
      cancelRef.current = streamExplain(
        { drivescore: p.drivescore, factors: p.factors, delta: p.delta, context: "driver_dashboard" },
        (full) => setExplainText(full),
        () => setStreaming(false),
      );
    })();
    return () => {
      alive = false;
      cancelRef.current?.();
    };
  }, [driverId]);

  const trips = useMemo(
    () => (driver ? recentTrips(driver.telematics, Number(driver.id.replace(/\D/g, "")) || 1) : []),
    [driver],
  );

  if (!driver || !price) return <Loading />;

  const policy = policyFor(driver);
  const pv = premiumView(price, policy.ncd);
  const tier = tierFor(price.band);
  const dom = price.factors[0];
  const savingMsg =
    dom && dom.contribution > 0
      ? `Improving ${dom.name.toLowerCase()} to the safe-cohort median could lift your DriveScore and lower next month's premium further.`
      : `You're already in the top safe cohort — you're earning the best available price.`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Persona switcher — flip between the three demo drivers */}
      <div className="mb-5">
        <div className="text-muted text-xs uppercase tracking-wide mb-2">Demo customer</div>
        <PersonaSwitcher active={driverId} onSelect={setDriverId} />
      </div>

      {/* Member header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: theme.color.panel2, border: `1px solid ${theme.color.line}`, color: theme.color.accent2 }}
          >
            {driver.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{driver.name}</h1>
            <div className="text-muted text-sm">
              Member since 2019 · {driver.vehicle_class.toUpperCase()} · age {driver.age}
            </div>
          </div>
        </div>
        <span
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: `${theme.color.accent}14`, border: `1px solid ${theme.color.accent}44`, color: theme.color.accent2 }}
        >
          {tier.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
        {/* Score + tier */}
        <div className="card p-8 flex flex-col items-center justify-center min-h-[300px]">
          <Gauge score={price.drivescore} band={price.band} />
          <div className="text-muted text-sm mt-2 text-center">{tier.blurb}</div>
        </div>

        {/* Policy chrome */}
        <PolicyCard policy={policy} />

        {/* Premium build-up (replaces the bare $/mo) */}
        <div className="card p-8">
          <RatingBreakdown pv={pv} />
        </div>

        {/* Factors */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold mb-1">What's affecting your DriveScore</h2>
          <div className="text-muted text-sm mb-4">Points deducted by behaviour, last 90 days</div>
          <FactorBars factors={price.factors} topN={3} />
        </div>

        {/* Trip history */}
        <div className="card p-8 lg:col-span-1">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent trips</h2>
            <span className="text-muted text-xs">last 7 days</span>
          </div>
          <TripList trips={trips} />
        </div>

        {/* Claims history — validates the DriveScore */}
        <div className="card p-8">
          <ClaimsHistory driverId={driver.id} drivescore={price.drivescore} />
        </div>

        {/* AI coach — full width across the grid */}
        <div className="card p-8 flex flex-col lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span style={{ color: theme.color.accent }}>◆</span> Your DriveScore coach
          </h2>
          <div className="flex-1 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
            <StreamingText text={explainText} streaming={streaming} />
            <div
              className="mt-5 lg:mt-0 p-4 rounded-xl text-sm"
              style={{ background: `${theme.color.accent}10`, border: `1px solid ${theme.color.accent}33` }}
            >
              <div className="text-accent2 font-semibold mb-1">Savings opportunity</div>
              <div className="text-text opacity-90">{savingMsg}</div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted text-xs mt-6 leading-relaxed">
        DriveScore is recalculated monthly from your telematics. Premium adjustments apply at renewal.
        Figures shown are indicative and subject to underwriting. {policy.cover} cover · No Claims Discount protected.
      </p>
    </div>
  );
}

function Loading() {
  return <div className="max-w-6xl mx-auto px-6 py-20 text-muted">Loading policy…</div>;
}
