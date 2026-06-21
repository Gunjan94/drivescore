import { theme } from "../theme";
import { sgd, type PremiumView } from "../domain";

/**
 * How a real motor quote is built up, line by line:
 *   Base premium (vehicle segment)
 *   ± DriveScore behaviour adjustment   ← the live telematics layer
 *   − No Claims Discount
 *   = Annual premium payable
 * with the legacy "standard table" price shown alongside as the before/after.
 */
export function RatingBreakdown({ pv }: { pv: PremiumView }) {
  const saving = pv.savingAnnual > 0;
  const adjColor = pv.behaviourAdj <= 0 ? theme.color.good : theme.color.bad;

  return (
    <div>
      <div className="text-muted text-xs tracking-widest uppercase mb-3">Premium build-up · annual</div>

      <Line label="Base premium" sub="vehicle segment" value={sgd(pv.baseAnnual)} />
      <Line
        label="DriveScore behaviour adjustment"
        sub={pv.behaviourAdj <= 0 ? "safe-driving discount" : "risk surcharge"}
        value={`${pv.behaviourAdj <= 0 ? "−" : "+"}${sgd(Math.abs(pv.behaviourAdj))}`}
        color={adjColor}
      />
      <Line
        label={`No Claims Discount (${pv.ncd}%)`}
        sub="claim-free history"
        value={`−${sgd(pv.ncdAmount)}`}
        color={theme.color.good}
      />

      <div className="h-px my-3" style={{ background: theme.color.line }} />

      <div className="flex items-end justify-between">
        <div>
          <div className="text-muted text-xs tracking-widest uppercase">Annual premium payable</div>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.05 }}>{sgd(pv.payableAnnual)}</div>
          <div className="text-muted text-sm">{sgd(pv.payableMonthly, 2)}/mo · 12 monthly instalments</div>
        </div>
      </div>

      <div
        className="mt-4 flex items-center justify-between gap-4 px-4 py-3 rounded-xl"
        style={{
          background: `${(saving ? theme.color.good : theme.color.bad)}10`,
          border: `1px solid ${(saving ? theme.color.good : theme.color.bad)}33`,
        }}
      >
        <div className="text-sm min-w-0">
          <div className="text-muted">Standard rate-table</div>
          <div className="line-through text-muted tabular-nums whitespace-nowrap">{sgd(pv.standardAnnual)}/yr</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted whitespace-nowrap">{saving ? "You save vs standard" : "Above standard"}</div>
          <div className="font-bold text-xl tabular-nums whitespace-nowrap" style={{ color: saving ? theme.color.good : theme.color.bad }}>
            {saving ? "−" : "+"}{sgd(Math.abs(pv.savingAnnual))}/yr
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, sub, value, color }: { label: string; sub?: string; value: string; color?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <div>
        <span className="font-medium">{label}</span>
        {sub && <span className="text-muted text-xs ml-2">{sub}</span>}
      </div>
      <span className="tabular-nums font-semibold" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
