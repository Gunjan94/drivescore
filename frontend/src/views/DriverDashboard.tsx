import { useEffect, useMemo, useRef, useState } from "react";
import {
  getDriver,
  getDriverTrips,
  getPrice,
  streamExplain,
  type DriverRow,
  type FleetTrips,
  type PriceResult,
} from "../api";
import { Gauge } from "../components/Gauge";
import { FactorBars } from "../components/FactorBar";
import { StreamingText } from "../components/StreamingText";
import { PolicyCard } from "../components/PolicyCard";
import { RatingBreakdown } from "../components/RatingBreakdown";
import { TripList } from "../components/TripList";
import { ClaimsHistory } from "../components/ClaimsHistory";
import { PersonaSwitcher } from "../components/PersonaSwitcher";
import { FleetMap, MapLegend } from "../components/FleetMap";
import { policyFor, premiumView, tierFor } from "../domain";
import { recentTrips } from "../trips";
import { OPERATOR, vehicleType } from "../fleet";
import { theme } from "../theme";

// Driver Detail — drill-down for one fleet driver/vehicle. Reached from the Fleet
// Command leaderboard or map, or via the persona switcher. Controlled by App so
// navigation from other views lands on the right driver.
export function DriverDashboard({
  driverId,
  onDriverChange,
}: {
  driverId: string;
  onDriverChange: (id: string) => void;
}) {
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [price, setPrice] = useState<PriceResult | null>(null);
  const [driverTrips, setDriverTrips] = useState<FleetTrips | null>(null);
  const [explainText, setExplainText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let alive = true;
    setDriver(null);
    setPrice(null);
    setDriverTrips(null);
    getDriverTrips(driverId, 6).then((t) => {
      if (alive) setDriverTrips(t);
    });
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

  const listTrips = useMemo(
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
      ? `Coaching ${dom.name.toLowerCase()} toward the safe-fleet median would lift this driver's DriveScore and cut the premium their vehicle adds to the fleet.`
      : `Already in the top safe cohort — this vehicle earns the fleet's best available rate.`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* View header */}
      <div className="mb-4">
        <div className="text-muted text-[11px] uppercase tracking-wide">Fleet operator view · {OPERATOR}</div>
        <h1 className="text-xl sm:text-2xl font-bold leading-tight">Driver detail</h1>
      </div>

      {/* Persona switcher — the three drivers the walkthrough narrates */}
      <div className="mb-5">
        <div className="text-muted text-xs uppercase tracking-wide mb-2">Jump to driver</div>
        <PersonaSwitcher active={driverId} onSelect={onDriverChange} />
      </div>

      {/* Member header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold shrink-0"
            style={{ background: theme.color.panel2, border: `1px solid ${theme.color.line}`, color: theme.color.accent2 }}
          >
            {driver.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold leading-tight truncate">{driver.name}</h2>
            <div className="text-muted text-sm">
              On fleet since 2019 · {vehicleType(driver.vehicle_class)} · {driver.id}
            </div>
          </div>
        </div>
        <span
          className="px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: `${theme.color.accent}14`, border: `1px solid ${theme.color.accent}44`, color: theme.color.accent2 }}
        >
          {tier.label}
        </span>
      </div>

      {/* Per-driver trip map — where & how this driver drives */}
      <div className="card p-4 sm:p-6 mb-5 sm:mb-6">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-lg font-semibold">This driver's recent trips</h3>
          <span className="text-muted text-xs">
            last 7 days{driverTrips?.bases?.[0] ? ` · home base ${driverTrips.bases[0].name.replace("Home · ", "")}` : ""}
          </span>
        </div>
        {driverTrips && driverTrips.trips.length > 0 ? (
          <>
            <FleetMap
              trips={driverTrips.trips}
              center={(driverTrips.bases?.[0] ? [driverTrips.bases[0].lat, driverTrips.bases[0].lng] : driverTrips.center) as [number, number]}
              bases={driverTrips.bases}
              zoom={12}
              className="h-[300px] sm:h-[380px] lg:h-[440px]"
            />
            <div className="mt-3">
              <MapLegend />
            </div>
          </>
        ) : (
          <div className="text-muted text-sm py-8 text-center">Loading trips…</div>
        )}
      </div>

      <div className="lg:columns-2 lg:gap-6">
        {/* Score + tier */}
        <div className="card p-6 sm:p-8 mb-5 sm:mb-6 break-inside-avoid flex flex-col items-center">
          <Gauge score={price.drivescore} band={price.band} />
          <div className="text-muted text-sm mt-3 text-center">{tier.blurb}</div>
        </div>

        {/* Policy chrome */}
        <div className="mb-5 sm:mb-6 break-inside-avoid">
          <PolicyCard policy={policy} />
        </div>

        {/* Premium build-up */}
        <div className="card p-6 sm:p-8 mb-5 sm:mb-6 break-inside-avoid">
          <RatingBreakdown pv={pv} />
        </div>

        {/* Factors */}
        <div className="card p-6 sm:p-8 mb-5 sm:mb-6 break-inside-avoid">
          <h3 className="text-lg font-semibold mb-1">What's affecting this DriveScore</h3>
          <div className="text-muted text-sm mb-4">Points lost to risky driving, last 90 days</div>
          <FactorBars factors={price.factors} topN={3} />
        </div>

        {/* Trip history list */}
        <div className="card p-6 sm:p-8 mb-5 sm:mb-6 break-inside-avoid">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent trips</h3>
            <span className="text-muted text-xs">last 7 days</span>
          </div>
          <TripList trips={listTrips} />
        </div>

        {/* Claims history */}
        <div className="card p-6 sm:p-8 mb-5 sm:mb-6 break-inside-avoid">
          <ClaimsHistory driverId={driver.id} drivescore={price.drivescore} />
        </div>
      </div>

      {/* AI coach */}
      <div className="card p-6 sm:p-8 flex flex-col">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span style={{ color: theme.color.accent }}>◆</span> DriveScore coaching insight
        </h3>
        <div className="flex-1 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
          <StreamingText text={explainText} streaming={streaming} />
          <div
            className="mt-5 lg:mt-0 p-4 rounded-xl text-sm"
            style={{ background: `${theme.color.accent}10`, border: `1px solid ${theme.color.accent}33` }}
          >
            <div className="text-accent2 font-semibold mb-1">Fleet savings opportunity</div>
            <div className="text-text opacity-90">{savingMsg}</div>
          </div>
        </div>
      </div>

      <p className="text-muted text-xs mt-5 sm:mt-6 leading-relaxed">
        DriveScore is recalculated monthly from vehicle telematics. Premium adjustments apply at renewal.
        Figures shown are indicative and subject to underwriting. {policy.cover} cover · fleet policy.
      </p>
    </div>
  );
}

function Loading() {
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-muted">Loading driver…</div>;
}
