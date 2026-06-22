import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DriverRow } from "../api";
import { theme } from "../theme";

function quad(d: DriverRow): "overcharged_safe" | "underpriced_risky" | "fair" {
  if (d.drivescore >= 75 && d.delta <= -8) return "overcharged_safe";
  if (d.drivescore < 60 && d.delta >= 8) return "underpriced_risky";
  return "fair";
}

function qColor(q: string): string {
  if (q === "overcharged_safe") return theme.color.good;
  if (q === "underpriced_risky") return theme.color.bad;
  return theme.color.muted; // "fair" — neutral, follows theme
}

/** Risk (DriveScore) vs current static price. Top-left = overcharged-safe,
 *  bottom-right = underpriced-risky. Click a point to inspect a driver. */
export function QuadrantScatter({
  drivers,
  onSelect,
  selectedId,
}: {
  drivers: DriverRow[];
  onSelect: (d: DriverRow) => void;
  selectedId?: string;
}) {
  const data = drivers.map((d) => ({
    x: d.drivescore,
    y: d.static_premium,
    q: quad(d),
    isHero: ["D0001", "D0002", "D0003"].includes(d.id),
    selected: d.id === selectedId,
    raw: d,
  }));

  return (
    <div className="w-full h-[340px] sm:h-[420px] lg:h-[460px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 16, bottom: 40, left: 8 }}>
        <CartesianGrid stroke={theme.color.line} strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, 100]}
          name="DriveScore"
          stroke={theme.color.muted}
          label={{ value: "DriveScore (safer →)", position: "bottom", fill: theme.color.muted }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Static premium"
          stroke={theme.color.muted}
          label={{ value: "Static price ($/mo)", angle: -90, position: "left", fill: theme.color.muted }}
        />
        <ZAxis type="number" range={[40, 220]} />
        <ReferenceLine x={70} stroke={theme.color.muted} strokeDasharray="6 6" />
        <ReferenceLine y={130} stroke={theme.color.muted} strokeDasharray="6 6" />
        <Tooltip
          cursor={{ stroke: theme.color.accent }}
          contentStyle={{ background: theme.color.panel2, border: `1px solid ${theme.color.line}`, borderRadius: 12 }}
          formatter={(_v, _n, p: any) => {
            const r: DriverRow = p.payload.raw;
            return [`${r.name} · score ${r.drivescore} · $${r.static_premium}/mo`, r.id];
          }}
        />
        <Scatter data={data} onClick={(p: any) => onSelect(p.raw)}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={qColor(d.q)}
              fillOpacity={d.q === "fair" ? 0.45 : 0.85}
              stroke={d.selected ? theme.color.text : d.isHero ? theme.color.accent2 : "none"}
              strokeWidth={d.selected ? 3 : d.isHero ? 2 : 0}
              style={{ cursor: "pointer" }}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
    </div>
  );
}
