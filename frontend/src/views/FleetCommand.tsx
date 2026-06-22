import { useEffect, useMemo, useState } from "react";
import { getFleetSummary, getFleetTrips, getPortfolio, type FleetSummary, type FleetTrips, type Portfolio } from "../api";
import { FleetMap, MapLegend } from "../components/FleetMap";
import { OPERATOR, INSURER, OPERATOR_TYPE, leaderboard, vehicleType } from "../fleet";
import { sgd, annual } from "../domain";
import { scoreColor, theme } from "../theme";

// Fleet Command — the Fleet CEO's home screen. Everything is the operator's own
// book of vehicles: fleet safety, where they drive, who needs coaching, and what
// it all costs in insurance vs the legacy static table.
export function FleetCommand({ onOpenDriver }: { onOpenDriver: (id: string) => void }) {
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [fleetTrips, setFleetTrips] = useState<FleetTrips | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [order, setOrder] = useState<"worst" | "best">("worst");
  const [showCalc, setShowCalc] = useState(false);

  useEffect(() => {
    getFleetSummary().then(setSummary);
    getFleetTrips(52).then(setFleetTrips);
    getPortfolio().then(setPortfolio);
  }, []);

  const board = useMemo(
    () => (portfolio ? leaderboard(portfolio.drivers, order).slice(0, 8) : []),
    [portfolio, order],
  );

  // How the "saved vs old flat rate" number is built, vehicle by vehicle.
  const calc = useMemo(() => {
    if (!portfolio) return null;
    let cheaper = 0;
    let cheaperTotal = 0;
    let dearer = 0;
    let dearerTotal = 0;
    for (const d of portfolio.drivers) {
      const yr = (d.static_premium - d.dynamic_premium) * 12; // +ve = cheaper on DriveScore
      if (yr >= 0) {
        cheaper += 1;
        cheaperTotal += yr;
      } else {
        dearer += 1;
        dearerTotal += -yr;
      }
    }
    return {
      cheaper,
      dearer,
      cheaperTotal: Math.round(cheaperTotal),
      dearerTotal: Math.round(dearerTotal),
      total: portfolio.drivers.length,
    };
  }, [portfolio]);

  if (!summary || !fleetTrips || !portfolio) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-muted">Loading fleet…</div>;
  }

  const safePct = Math.round((100 * summary.safe) / summary.total_vehicles);
  const modPct = Math.round((100 * summary.moderate) / summary.total_vehicles);
  const highPct = 100 - safePct - modPct;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* View header — names the stakeholder */}
      <div className="mb-5 sm:mb-6">
        <div className="text-muted text-[11px] uppercase tracking-wide">Fleet operator view</div>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Fleet Command</h1>
        <div className="text-muted text-sm">
          {OPERATOR} · {OPERATOR_TYPE} · insured by {INSURER}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <Kpi label="Vehicles" value={summary.total_vehicles.toLocaleString()} sub="active in fleet" />
        <Kpi
          label="Fleet safety score"
          value={`${summary.avg_score}`}
          sub="fleet average (0–100)"
          valueColor={scoreColor(summary.avg_score)}
        />
        <Kpi
          label="Risky drivers"
          value={`${summary.at_risk}`}
          sub={`${highPct}% of fleet · coach these first`}
          valueColor={theme.color.bad}
        />
        <Kpi label="Insurance / year" value={sgd(summary.annual_premium)} sub="based on real driving" />
        <Kpi
          label="Saved vs old flat rate"
          value={sgd(summary.vs_static_savings)}
          sub="every year"
          valueColor={theme.color.good}
          delta="↓"
        />
      </div>

      {/* Map — the hero */}
      <div className="card p-4 sm:p-6 mb-5 sm:mb-6">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-lg">Fleet ride map · last 7 days</h2>
            <div className="text-muted text-sm">
              {fleetTrips.count} recent trips across the fleet — routes coloured by safety, events plotted live
            </div>
          </div>
        </div>
        <FleetMap
          trips={fleetTrips.trips}
          center={fleetTrips.center}
          bases={fleetTrips.bases}
          onSelectDriver={onOpenDriver}
        />
        <div className="mt-3">
          <MapLegend />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Leaderboard */}
        <div className="card p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold text-lg">Driver safety leaderboard</h2>
            <div className="flex gap-1 text-sm">
              <Toggle active={order === "worst"} onClick={() => setOrder("worst")}>Needs coaching</Toggle>
              <Toggle active={order === "best"} onClick={() => setOrder("best")}>Safest</Toggle>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {board.map((d) => (
              <button
                key={d.id}
                onClick={() => onOpenDriver(d.id)}
                className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl text-left transition-colors w-full"
                style={{ background: theme.color.panel2, border: `1px solid ${theme.color.line}` }}
              >
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-sm"
                  style={{ background: `${scoreColor(d.drivescore)}22`, color: scoreColor(d.drivescore) }}
                >
                  {d.drivescore}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{d.name}</div>
                  <div className="text-muted text-xs truncate">
                    {vehicleType(d.vehicle_class)} · {d.id}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="tabular-nums text-sm font-medium">{sgd(annual(d.dynamic_premium))}</div>
                  <div className="text-muted text-[11px]">insurance / year</div>
                </div>
                <span className="text-muted hidden sm:inline" aria-hidden>›</span>
              </button>
            ))}
          </div>
          <div className="text-muted text-xs mt-3">Tap any driver to see their driving, trip map &amp; coaching tips.</div>
        </div>

        {/* Insurance impact */}
        <div className="flex flex-col gap-5 sm:gap-6">
          <div className="card p-4 sm:p-6">
            <h2 className="font-semibold text-lg mb-1">What it costs to insure</h2>
            <div className="text-muted text-sm mb-4">Whole fleet, per year</div>

            <Row label="Old flat-rate bill" value={sgd(summary.annual_premium_static)} muted />
            <Row label="DriveScore (pay for real driving)" value={sgd(summary.annual_premium)} strong />
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-semibold" style={{ color: theme.color.good }}>You save today</span>
              <span className="tabular-nums font-bold" style={{ color: theme.color.good }}>
                {sgd(summary.vs_static_savings)}/yr
              </span>
            </div>

            <button
              onClick={() => setShowCalc((v) => !v)}
              className="text-xs font-medium underline mb-2"
              style={{ color: theme.color.accent2 }}
            >
              {showCalc ? "Hide calculation" : "Show how this is calculated"}
            </button>

            {showCalc && calc && (
              <div
                className="mb-4 p-3 rounded-xl text-sm"
                style={{ background: theme.color.panel2, border: `1px solid ${theme.color.line}` }}
              >
                <div className="text-muted text-xs mb-2 leading-relaxed">
                  For each of your {calc.total.toLocaleString()} vehicles we take the old flat-rate price
                  minus the DriveScore price, then add it all up:
                </div>
                <CalcRow label="Old flat-rate bill (all vehicles)" value={sgd(summary.annual_premium_static)} />
                <CalcRow label="− DriveScore bill (all vehicles)" value={sgd(summary.annual_premium)} />
                <div className="h-px my-2" style={{ background: theme.color.line }} />
                <CalcRow label="= You save / year" value={sgd(summary.vs_static_savings)} strong color={theme.color.good} />
                <div className="text-muted text-xs mt-3 leading-relaxed">
                  Made up of <span style={{ color: theme.color.good }}>{calc.cheaper.toLocaleString()} vehicles that
                  now cost less (−{sgd(calc.cheaperTotal)}/yr)</span> and{" "}
                  <span style={{ color: theme.color.bad }}>{calc.dearer.toLocaleString()} genuinely risky vehicles
                  that correctly cost more (+{sgd(calc.dearerTotal)}/yr)</span>.
                </div>
              </div>
            )}

            <div className="h-px my-3" style={{ background: theme.color.line }} />

            <div className="text-muted text-sm mb-2">If your risky drivers improve to a safe level:</div>
            <Row label="New bill after coaching" value={sgd(summary.annual_premium_coached)} />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold" style={{ color: theme.color.accent2 }}>Extra yearly saving</span>
              <span className="tabular-nums font-bold" style={{ color: theme.color.accent2 }}>
                {sgd(summary.coaching_savings)}/yr
              </span>
            </div>
          </div>

          {/* Band split */}
          <div className="card p-4 sm:p-6">
            <h2 className="font-semibold text-lg mb-3">Fleet risk mix</h2>
            <div className="flex h-3 rounded-full overflow-hidden mb-3" style={{ background: theme.color.panel2 }}>
              <div style={{ width: `${safePct}%`, background: theme.color.good }} />
              <div style={{ width: `${modPct}%`, background: theme.color.warn }} />
              <div style={{ width: `${highPct}%`, background: theme.color.bad }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Split n={summary.safe} pct={safePct} label="Safe" color={theme.color.good} />
              <Split n={summary.moderate} pct={modPct} label="Moderate" color={theme.color.warn} />
              <Split n={summary.high_risk} pct={highPct} label="High-risk" color={theme.color.bad} />
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted text-xs mt-5 sm:mt-6 leading-relaxed">
        {OPERATOR} and {INSURER} are named illustratively for this prototype. All telematics, scores,
        trips and premiums are synthetic and computed by the DriveScore engine — no real company data is
        used. Premium figures are indicative and subject to underwriting.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  valueColor,
  delta,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  delta?: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-muted text-[11px] uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <div style={{ fontSize: "clamp(20px, 5vw, 30px)", fontWeight: 800, lineHeight: 1, color: valueColor }}>
          {value}
        </div>
        {delta && <span className="text-sm font-bold" style={{ color: valueColor }}>{delta}</span>}
      </div>
      <div className="text-muted text-[11px] mt-1">{sub}</div>
    </div>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex justify-between items-baseline mb-1.5">
      <span className={`text-sm ${muted ? "text-muted" : ""}`}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold text-base" : "text-sm"}`}>{value}</span>
    </div>
  );
}

function CalcRow({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-muted">{label}</span>
      <span className="tabular-nums text-sm" style={{ fontWeight: strong ? 800 : 600, color }}>{value}</span>
    </div>
  );
}

function Split({ n, pct, label, color }: { n: number; pct: number; label: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{n}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
      <div className="text-[11px] text-muted">{pct}%</div>
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg font-medium transition-colors"
      style={{
        background: active ? theme.color.accent : "transparent",
        color: active ? theme.color.ink : theme.color.muted,
        border: `1px solid ${active ? theme.color.accent : theme.color.line}`,
      }}
    >
      {children}
    </button>
  );
}
