import type { Factor } from "../api";
import { theme } from "../theme";

/** Horizontal bar per factor showing points-of-risk it cost the DriveScore. */
export function FactorBar({ factor, max, highlight }: { factor: Factor; max: number; highlight?: boolean }) {
  const pct = max > 0 ? Math.round((factor.contribution / max) * 100) : 0;
  const color =
    factor.contribution >= 15 ? theme.color.bad : factor.contribution >= 6 ? theme.color.warn : theme.color.accent;
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between mb-1">
        <span className={"font-medium " + (highlight ? "text-accent2" : "")}>{factor.name}</span>
        <span className="text-muted tabular-nums">
          −{factor.contribution} <span className="text-xs">pts</span>
        </span>
      </div>
      <div className="h-3 rounded-full" style={{ background: theme.color.line }}>
        <div
          className="h-3 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(pct, factor.contribution > 0 ? 6 : 0)}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function FactorBars({ factors, topN = 5 }: { factors: Factor[]; topN?: number }) {
  const shown = factors.slice(0, topN);
  const max = Math.max(1, ...factors.map((f) => f.contribution));
  return (
    <div>
      {shown.map((f, i) => (
        <FactorBar key={f.key} factor={f} max={max} highlight={i === 0 && f.contribution > 0} />
      ))}
    </div>
  );
}
