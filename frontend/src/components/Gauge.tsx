import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { scoreColor, theme } from "../theme";

/** DriveScore 0-100 radial gauge with a big headline number. */
export function Gauge({ score, band }: { score: number; band: string }) {
  const color = scoreColor(score);
  const data = [{ name: "score", value: score, fill: color }];
  return (
    <div className="relative flex items-center justify-center">
      <RadialBarChart
        width={300}
        height={300}
        cx={150}
        cy={150}
        innerRadius={108}
        outerRadius={140}
        barSize={26}
        data={data}
        startAngle={220}
        endAngle={-40}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background={{ fill: theme.color.line }} dataKey="value" cornerRadius={14} angleAxisId={0} />
      </RadialBarChart>
      <div className="absolute flex flex-col items-center">
        <div style={{ fontSize: 84, lineHeight: 1, fontWeight: 800, color }}>{score}</div>
        <div className="text-muted text-sm tracking-widest mt-1">DRIVESCORE</div>
        <div
          className="mt-3 px-4 py-1 rounded-full text-sm font-semibold uppercase tracking-wide"
          style={{ color, border: `1px solid ${color}55`, background: `${color}14` }}
        >
          {band}
        </div>
      </div>
    </div>
  );
}
