import { useEffect, useMemo, useState } from "react";
import { getPortfolio, type DriverRow, type Portfolio } from "../api";
import { QuadrantScatter } from "../components/QuadrantScatter";
import { ClaimsHistory } from "../components/ClaimsHistory";
import { scoreColor, theme } from "../theme";
import { sgd, annual, ncdPct } from "../domain";

export function UnderwriterConsole() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [selected, setSelected] = useState<DriverRow | null>(null);

  useEffect(() => {
    getPortfolio().then(setData);
  }, []);

  // Book-level KPIs derived from the real per-driver premiums in the sample,
  // scaled to a representative 50k-policy book (same basis the backend uses for
  // loss reduction). All figures move if the underlying engine output moves.
  const kpis = useMemo(() => {
    if (!data) return null;
    const n = data.drivers.length || 1;
    const scale = 50000 / n;
    const gwp = data.drivers.reduce((s, d) => s + annual(d.dynamic_premium), 0) * scale;
    const avgScore = Math.round(data.drivers.reduce((s, d) => s + d.drivescore, 0) / n);
    // Loss ratios are computed on the backend from the book's risk-calibrated
    // expected losses + adverse selection (see engine.loss_ratio_before_after).
    const lossRatioBefore = data.summary.loss_ratio_before;
    const lossRatioAfter = data.summary.loss_ratio_after;
    const retentionBefore = 81.0;
    const retentionAfter = +(retentionBefore + data.summary.projected_retention_gain_pct).toFixed(1);
    return { gwp, avgScore, lossRatioBefore, lossRatioAfter, retentionBefore, retentionAfter };
  }, [data]);

  if (!data || !kpis) return <div className="max-w-7xl mx-auto px-6 py-20 text-muted">Loading book…</div>;
  const s = data.summary;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">Underwriter Console</h1>
          <div className="text-muted">
            Motor book · {s.total_drivers}-policy sample, modelled to a 50,000-policy portfolio
          </div>
        </div>
        <span className="text-muted text-sm">Portfolio risk &amp; pricing</span>
      </div>

      {/* KPI strip — real actuarial vocabulary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Gross written premium"
          value={`${sgd(kpis.gwp / 1e6, 1)}M`}
          sub="annualised, modelled book"
        />
        <Kpi
          label="Loss ratio"
          value={`${(kpis.lossRatioAfter * 100).toFixed(1)}%`}
          sub={`from ${(kpis.lossRatioBefore * 100).toFixed(1)}% on static pricing`}
          delta={`−${((kpis.lossRatioBefore - kpis.lossRatioAfter) * 100).toFixed(1)}pp`}
          deltaGood
        />
        <Kpi
          label="Retention rate"
          value={`${kpis.retentionAfter}%`}
          sub={`from ${kpis.retentionBefore}%`}
          delta={`+${s.projected_retention_gain_pct}pp`}
          deltaGood
        />
        <Kpi label="Avg. DriveScore" value={`${kpis.avgScore}`} sub="portfolio mean, 0–100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scatter */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-semibold">Risk vs. premium — mispricing map</h2>
            <div className="flex items-center gap-5 text-sm flex-wrap">
              <Legend color={theme.color.good} label="Overcharged-safe (churn risk)" />
              <Legend color={theme.color.bad} label="Underpriced-risky (loss leakage)" />
              <Legend color={theme.color.muted} label="Adequately rated" />
            </div>
          </div>
          <QuadrantScatter drivers={data.drivers} onSelect={setSelected} selectedId={selected?.id} />
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <Counter value={s.overcharged_safe} label="Overcharged-safe" color={theme.color.good} sub="churn / lapse risk" />
            <Counter value={s.underpriced_risky} label="Underpriced-risky" color={theme.color.bad} sub="loss leakage" />
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Repricing impact</h2>
            <Impact
              label="Projected retention gain"
              value={`+${s.projected_retention_gain_pct}%`}
              color={theme.color.good}
              note="fair-pricing safe drivers reduces lapse"
            />
            <div className="h-px my-4" style={{ background: theme.color.line }} />
            <Impact
              label="Annual loss leakage recovered"
              value={`${sgd(s.projected_annual_loss_reduction / 1e6, 2)}M`}
              color={theme.color.accent2}
              note="from correctly rating the risky tail"
            />
          </div>

          {selected ? (
            <SelectedCard d={selected} />
          ) : (
            <div className="card p-6 text-muted text-sm">Select any policy on the map to inspect its rating.</div>
          )}
        </div>
      </div>

      <p className="text-muted text-xs mt-6 leading-relaxed">
        Loss ratio and retention figures are illustrative, modelled on the synthetic sample book. Premiums shown
        in SGD, comprehensive cover. Repricing applies at renewal subject to regulatory rate-filing.
      </p>
    </div>
  );
}

function Kpi({ label, value, sub, delta, deltaGood }: { label: string; value: string; sub: string; delta?: string; deltaGood?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-muted text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value}</div>
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

function Counter({ value, label, color, sub }: { value: number; label: string; color: string; sub: string }) {
  return (
    <div className="card p-5">
      <div style={{ fontSize: 48, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div className="font-medium mt-2">{label}</div>
      <div className="text-muted text-xs">{sub}</div>
    </div>
  );
}

function Impact({ label, value, color, note }: { label: string; value: string; color: string; note: string }) {
  return (
    <div>
      <div className="text-muted text-sm">{label}</div>
      <div style={{ fontSize: 40, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div className="text-muted text-xs mt-1">{note}</div>
    </div>
  );
}

function SelectedCard({ d }: { d: DriverRow }) {
  const saving = d.delta < 0;
  const ncd = ncdPct(d.id);
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <div className="font-semibold text-lg">{d.name}</div>
        <div style={{ color: scoreColor(d.drivescore), fontWeight: 800, fontSize: 28 }}>{d.drivescore}</div>
      </div>
      <div className="text-muted text-sm mb-3">
        {d.vehicle_class.toUpperCase()} · NCD {ncd}% · {d.id}
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">Standard table</span>
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
    </div>
  );
}
