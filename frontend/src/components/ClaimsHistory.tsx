import { theme } from "../theme";
import { sgd } from "../domain";
import { claimsFor } from "../claims";

/**
 * Claims system-of-record panel. Shows the driver's past claims and — the pitch
 * payload — a validation banner tying the claims experience back to DriveScore:
 * risky drivers' losses confirm the model; safe drivers' clean record confirms
 * they're overcharged.
 */
export function ClaimsHistory({ driverId, drivescore, compact }: { driverId: string; drivescore: number; compact?: boolean }) {
  const rec = claimsFor(driverId, drivescore);
  const v = rec.validation;
  const vColor =
    v.kind === "risk_confirmed" ? theme.color.bad : v.kind === "low_risk_confirmed" ? theme.color.good : theme.color.muted;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className={compact ? "font-semibold" : "text-lg font-semibold"}>Claims history</h2>
        <span className="text-muted text-xs">system of record · last 3 years</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat
          value={rec.claims.length === 0 ? `${rec.claimFreeYears}y` : String(rec.claims.length)}
          label={rec.claims.length === 0 ? "claim-free" : "claims"}
          color={rec.claims.length === 0 ? theme.color.good : theme.color.text}
        />
        <Stat value={String(rec.atFaultCount)} label="at-fault" color={rec.atFaultCount > 0 ? theme.color.bad : theme.color.good} />
        <Stat value={rec.totalIncurred === 0 ? "—" : sgd(rec.totalIncurred)} label="incurred" color={theme.color.text} />
      </div>

      {/* Validation banner — the pitch line */}
      <div
        className="px-4 py-3 rounded-xl mb-4"
        style={{ background: `${vColor}12`, border: `1px solid ${vColor}40` }}
      >
        <div className="font-semibold text-sm flex items-center gap-2" style={{ color: vColor }}>
          {v.kind === "risk_confirmed" ? "⚠" : v.kind === "low_risk_confirmed" ? "✓" : "•"} {v.headline}
        </div>
        <div className="text-muted text-xs mt-1 leading-relaxed">{v.detail}</div>
      </div>

      {/* Claim rows */}
      {rec.claims.length === 0 ? (
        <div
          className="px-4 py-6 rounded-xl text-center text-sm"
          style={{ background: theme.color.panel2, border: `1px dashed ${theme.color.line}`, color: theme.color.muted }}
        >
          No claims on record — {rec.claimFreeYears} consecutive claim-free years.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rec.claims.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: theme.color.panel2, border: `1px solid ${theme.color.line}` }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                  {c.type}
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                    style={
                      c.atFault
                        ? { color: theme.color.bad, background: `${theme.color.bad}1A` }
                        : { color: theme.color.good, background: `${theme.color.good}1A` }
                    }
                  >
                    {c.atFault ? "At fault" : "Not at fault"}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {c.date} · {c.id}
                  {c.cause && (
                    <span style={{ color: theme.color.warn }}> · linked to {c.cause}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold tabular-nums">{sgd(c.amount)}</div>
                <div className="text-[10px] text-muted">{c.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center px-2 py-3 rounded-xl" style={{ background: theme.color.panel2, border: `1px solid ${theme.color.line}` }}>
      <div className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-muted mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}
