import { theme } from "../theme";

/** Big current premium + struck-through static baseline + the saving/surcharge delta. */
export function PremiumDelta({
  dynamic,
  staticPremium,
  delta,
}: {
  dynamic: number;
  staticPremium: number;
  delta: number;
}) {
  const saving = delta < 0;
  const deltaColor = saving ? theme.color.good : delta > 0 ? theme.color.bad : theme.color.muted;
  return (
    <div>
      <div className="text-muted text-sm tracking-widest mb-1">MONTHLY PREMIUM</div>
      <div className="flex items-end gap-4 flex-wrap">
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1 }}>
          ${dynamic.toFixed(2)}
        </div>
        <div className="pb-2">
          <div className="text-muted line-through text-2xl">${staticPremium.toFixed(0)}</div>
          <div className="text-muted text-xs">static table</div>
        </div>
      </div>
      <div
        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl font-bold text-lg"
        style={{ color: deltaColor, background: `${deltaColor}14`, border: `1px solid ${deltaColor}44` }}
      >
        <span style={{ fontSize: 20 }}>{saving ? "▼" : delta > 0 ? "▲" : "■"}</span>
        {saving ? "Saving" : delta > 0 ? "Surcharge" : "Even"} ${Math.abs(delta).toFixed(2)}/mo
        <span className="text-muted font-normal text-sm">vs static</span>
      </div>
    </div>
  );
}
