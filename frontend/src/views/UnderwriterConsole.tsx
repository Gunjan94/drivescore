import { useEffect, useMemo, useState } from "react";
import { getPortfolio, type DriverRow, type Portfolio } from "../api";
import { QuadrantScatter } from "../components/QuadrantScatter";
import { ClaimsHistory } from "../components/ClaimsHistory";
import { scoreColor, theme } from "../theme";
import { sgd, annual, ncdPct } from "../domain";
import { OPERATOR, INSURER, vehicleType, quadrantOf, type Quadrant } from "../fleet";

// Insurer View — the insurance company owner's screen. Two clearly-separated
// halves: (1) MAP + the SELECTED vehicle's pricing, side by side; (2) WHOLE-FLEET
// totals, where the two mispriced groups are clickable to list their drivers.
export function UnderwriterConsole({ onOpenDriver }: { onOpenDriver?: (id: string) => void }) {
  const [data, setData] = useState<Portfolio | null>(null);
  const [selected, setSelected] = useState<DriverRow | null>(null);
  const [category, setCategory] = useState<Quadrant | null>(null);

  useEffect(() => {
    getPortfolio().then(setData);
  }, []);

  const kpis = useMemo(() => {
    if (!data) return null;
    const n = data.drivers.length || 1;
    const scale = 50000 / n;
    const gwp = data.drivers.reduce((s, d) => s + annual(d.dynamic_premium), 0) * scale;
    const avgScore = Math.round(data.drivers.reduce((s, d) => s + d.drivescore, 0) / n);
    return {
      gwp,
      avgScore,
      lossRatioBefore: data.summary.loss_ratio_before,
      lossRatioAfter: data.summary.loss_ratio_after,
      retentionBefore: 81.0,
      retentionAfter: +(81.0 + data.summary.projected_retention_gain_pct).toFixed(1),
    };
  }, [data]);

  // Drivers in the currently-selected mispriced group, most-mispriced first.
  const categoryList = useMemo(() => {
    if (!data || !category) return [];
    return data.drivers
      .filter((d) => quadrantOf(d) === category)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [data, category]);

  if (!data || !kpis) return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-muted">Loading book…</div>;
  const s = data.summary;

  const pickCategory = (c: Quadrant) => setCategory((prev) => (prev === c ? null : c));
  const CAT_LABEL: Record<string, string> = {
    overcharged_safe: "Safe but overcharged",
    underpriced_risky: "Risky but underpriced",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-5 sm:mb-6">
        <div className="text-muted text-[11px] uppercase tracking-wide">Insurer view · {INSURER}</div>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Underwriting console</h1>
        <div className="text-muted text-sm">
          {OPERATOR} fleet motor · {s.total_drivers} vehicles in this fleet, scaled to a 50,000-vehicle book
        </div>
      </div>

      {/* Fleet-wide headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <Kpi label="Premium written / year" value={`${sgd(kpis.gwp / 1e6, 1)}M`} sub="estimated, full 50k book" />
        <Kpi
          label="Claims cost ratio"
          value={`${(kpis.lossRatioAfter * 100).toFixed(1)}%`}
          sub={`was ${(kpis.lossRatioBefore * 100).toFixed(1)}% on old flat pricing`}
          delta={`−${((kpis.lossRatioBefore - kpis.lossRatioAfter) * 100).toFixed(1)}pp`}
          deltaGood
        />
        <Kpi
          label="Drivers retained"
          value={`${kpis.retentionAfter}%`}
          sub={`up from ${kpis.retentionBefore}%`}
          delta={`+${s.projected_retention_gain_pct}pp`}
          deltaGood
        />
        <Kpi label="Avg. DriveScore" value={`${kpis.avgScore}`} sub="fleet average (0–100)" />
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        {/* whole-fleet section is order-1 (renders first); inspect is order-2 */}
        <div className="order-2">
          <div className="text-muted text-[11px] uppercase tracking-wide mb-2">Inspect one vehicle</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="card p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-semibold">Risk vs. price — every vehicle</h2>
            <div className="flex items-center gap-x-4 gap-y-1 text-sm flex-wrap">
              <Legend color={theme.color.good} label="Safe but overcharged" />
              <Legend color={theme.color.bad} label="Risky but underpriced" />
              <Legend color={theme.color.muted} label="Priced about right" />
            </div>
          </div>
          <QuadrantScatter drivers={data.drivers} onSelect={setSelected} selectedId={selected?.id} />
          <div className="text-muted text-xs mt-2">Tap any dot to see that vehicle's pricing on the right.</div>
        </div>

        <div className="flex flex-col">
          <div className="text-muted text-xs uppercase tracking-wide mb-2">Selected vehicle</div>
          {selected ? (
            <SelectedCard d={selected} onOpenDriver={onOpenDriver} />
          ) : (
            <div className="card p-4 sm:p-6 text-muted text-sm flex-1 flex items-center justify-center text-center">
              Tap a vehicle on the chart (or a name in the lists above) to see its full pricing here.
            </div>
          )}
        </div>
      </div>
        </div>

        <div className="order-1">
          <div className="text-muted text-[11px] uppercase tracking-wide mb-2">Across the whole fleet</div>
      <div className="card p-4 sm:p-6">
        <div className="text-muted text-sm mb-4">
          Totals for all {s.total_drivers} vehicles — these don't change when you pick a vehicle below. Tap a
          mispriced group to list its drivers.
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <CategoryCounter
            value={s.overcharged_safe}
            label="Safe but overcharged"
            sub="may switch away"
            color={theme.color.good}
            active={category === "overcharged_safe"}
            onClick={() => pickCategory("overcharged_safe")}
          />
          <CategoryCounter
            value={s.underpriced_risky}
            label="Risky but underpriced"
            sub="costing us claims"
            color={theme.color.bad}
            active={category === "underpriced_risky"}
            onClick={() => pickCategory("underpriced_risky")}
          />
          <Impact
            label="More drivers stay"
            value={`+${s.projected_retention_gain_pct}%`}
            color={theme.color.good}
            note="fair pricing keeps safe drivers"
          />
          <Impact
            label="Claims losses recovered / yr"
            value={`${sgd(s.projected_annual_loss_reduction / 1e6, 2)}M`}
            color={theme.color.accent2}
            note="from pricing risky drivers right"
          />
        </div>

        {category && (
          <>
            <div className="h-px my-4" style={{ background: theme.color.line }} />
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-semibold">
                {CAT_LABEL[category]} — {categoryList.length} vehicles
              </h3>
              <button
                onClick={() => setCategory(null)}
                className="text-sm text-muted underline"
              >
                Close list
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-80 overflow-auto pr-1">
              {categoryList.slice(0, 60).map((d) => {
                const isSel = selected?.id === d.id;
                const over = d.delta < 0;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left w-full transition-colors"
                    style={{
                      background: isSel ? `${theme.color.accent}1A` : theme.color.panel2,
                      border: `1px solid ${isSel ? theme.color.accent : theme.color.line}`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 text-sm"
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
                      <div className="tabular-nums text-sm" style={{ color: over ? theme.color.good : theme.color.bad }}>
                        {over ? "−" : "+"}{sgd(annual(Math.abs(d.delta)))}/yr
                      </div>
                      <div className="text-muted text-[11px]">{over ? "overcharged" : "underpriced"}</div>
                    </div>
                  </button>
                );
              })}
              {categoryList.length > 60 && (
                <div className="text-muted text-xs text-center py-2">
                  Showing the 60 most mispriced of {categoryList.length}.
                </div>
              )}
            </div>
          </>
        )}
      </div>
        </div>
      </div>

      <p className="text-muted text-xs mt-5 sm:mt-6 leading-relaxed">
        Claims-cost and retention figures are estimates based on synthetic data. Premiums shown in SGD,
        comprehensive cover. New pricing applies at renewal, subject to regulatory approval.
      </p>
    </div>
  );
}

function Kpi({ label, value, sub, delta, deltaGood }: { label: string; value: string; sub: string; delta?: string; deltaGood?: boolean }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-muted text-[11px] uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <div style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800, lineHeight: 1 }}>{value}</div>
        {delta && (
          <span className="text-sm font-semibold" style={{ color: deltaGood ? theme.color.good : theme.color.bad }}>
            {delta}
          </span>
        )}
      </div>
      <div className="text-muted text-xs mt-1">{sub}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-text opacity-90">
      <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function CategoryCounter({
  value,
  label,
  sub,
  color,
  active,
  onClick,
}: {
  value: number;
  label: string;
  sub: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 sm:p-5 rounded-2xl transition-colors"
      style={{
        background: active ? `${color}14` : theme.color.panel2,
        border: `1px solid ${active ? color : theme.color.line}`,
      }}
    >
      <div style={{ fontSize: "clamp(28px, 7vw, 44px)", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div className="font-medium mt-2 flex items-center gap-1">
        {label}
        <span className="text-muted text-xs">{active ? "▾" : "›"}</span>
      </div>
      <div className="text-muted text-xs">{sub} · tap to list</div>
    </button>
  );
}

function Impact({ label, value, color, note }: { label: string; value: string; color: string; note: string }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl" style={{ background: theme.color.panel2, border: `1px solid ${theme.color.line}` }}>
      <div className="text-muted text-xs">{label}</div>
      <div style={{ fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div className="text-muted text-xs mt-1">{note}</div>
    </div>
  );
}

function SelectedCard({ d, onOpenDriver }: { d: DriverRow; onOpenDriver?: (id: string) => void }) {
  const saving = d.delta < 0;
  const ncd = ncdPct(d.id);
  return (
    <div className="card p-4 sm:p-6 flex-1">
      <div className="flex items-baseline justify-between">
        <div className="font-semibold text-lg">{d.name}</div>
        <div style={{ color: scoreColor(d.drivescore), fontWeight: 800, fontSize: 28 }}>{d.drivescore}</div>
      </div>
      <div className="text-muted text-sm mb-3">
        {vehicleType(d.vehicle_class)} · NCD {ncd}% · {d.id}
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">Old flat rate</span>
        <span className="tabular-nums">{sgd(annual(d.static_premium))}/yr</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">DriveScore rate</span>
        <span className="tabular-nums">{sgd(annual(d.dynamic_premium))}/yr</span>
      </div>
      <div className="flex justify-between font-semibold mt-1" style={{ color: saving ? theme.color.good : theme.color.bad }}>
        <span>{saving ? "Overcharged by" : "Underpriced by"}</span>
        <span className="tabular-nums">{sgd(annual(Math.abs(d.delta)))}/yr</span>
      </div>
      <div className="h-px my-4" style={{ background: theme.color.line }} />
      <ClaimsHistory driverId={d.id} drivescore={d.drivescore} compact />
      {onOpenDriver && (
        <button
          onClick={() => onOpenDriver(d.id)}
          className="mt-4 w-full px-4 py-2.5 rounded-xl font-medium transition-colors"
          style={{ background: theme.color.accent, color: theme.color.ink, minHeight: theme.touch.minTarget }}
        >
          Open driver detail →
        </button>
      )}
    </div>
  );
}
