import { useEffect, useRef, useState } from "react";
import {
  getPrice,
  streamExplain,
  type DriverMeta,
  type PriceResult,
  type Telematics,
} from "../api";
import { Gauge } from "../components/Gauge";
import { FactorBars } from "../components/FactorBar";
import { StreamingText } from "../components/StreamingText";
import { RatingBreakdown } from "../components/RatingBreakdown";
import { premiumView, tierFor, ncdPct } from "../domain";
import { theme } from "../theme";

interface SliderDef {
  key: keyof Telematics;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const SLIDERS: SliderDef[] = [
  { key: "night_pct", label: "Night driving", min: 0, max: 0.6, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
  { key: "hard_brakes_per_100km", label: "Hard braking / 100km", min: 0, max: 12, step: 0.1, format: (v) => v.toFixed(1) },
  { key: "avg_speed_kmh", label: "Average speed", min: 40, max: 130, step: 1, format: (v) => `${v} km/h` },
  { key: "harsh_corners_per_100km", label: "Harsh cornering / 100km", min: 0, max: 8, step: 0.1, format: (v) => v.toFixed(1) },
  { key: "monthly_km", label: "Monthly mileage", min: 200, max: 3000, step: 10, format: (v) => `${v} km` },
];

const NAME: Record<string, string> = {
  night_pct: "Night driving",
  hard_brakes_per_100km: "Hard braking",
  avg_speed_kmh: "Average speed",
  harsh_corners_per_100km: "Harsh cornering",
  monthly_km: "Monthly mileage",
};

// Start on Marcus-like risky telematics — the "drag the slider" villain.
const INITIAL: Telematics = {
  avg_speed_kmh: 99,
  hard_brakes_per_100km: 6.2,
  night_pct: 0.35,
  monthly_km: 1820,
  harsh_corners_per_100km: 4.3,
};
const META: DriverMeta = { age: 29, postcode: "3550", vehicle_class: "suv" };
const QUOTE_NCD = ncdPct("D0002"); // Marcus's NCD tier drives this indicative quote

export function PricingEngine() {
  const [tel, setTel] = useState<Telematics>(INITIAL);
  const [price, setPrice] = useState<PriceResult | null>(null);
  const [explainText, setExplainText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [lastChanged, setLastChanged] = useState<keyof Telematics | null>(null);

  const debounceRef = useRef<number | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // Debounced score/price recompute on every slider move (~150ms).
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      getPrice(tel, META).then(setPrice);
    }, 150);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [tel]);

  useEffect(() => {
    getPrice(INITIAL, META).then((p) => {
      setPrice(p);
      runExplain(p, null);
    });
    return () => cancelRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runExplain(p: PriceResult, changed: keyof Telematics | null) {
    cancelRef.current?.();
    setExplainText("");
    setStreaming(true);
    cancelRef.current = streamExplain(
      {
        drivescore: p.drivescore,
        factors: p.factors,
        delta: p.delta,
        context: "price_change",
        changed_factor: changed ? NAME[changed] : undefined,
      },
      (full) => setExplainText(full),
      () => setStreaming(false),
    );
  }

  function handleRelease() {
    getPrice(tel, META).then((p) => {
      setPrice(p);
      runExplain(p, lastChanged);
    });
  }

  function onSlide(key: keyof Telematics, value: number) {
    setLastChanged(key);
    setTel((prev) => ({ ...prev, [key]: value }));
  }

  const pv = price ? premiumView(price, QUOTE_NCD) : null;
  const tier = price ? tierFor(price.band) : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">Live Rating Engine</h1>
          <div className="text-muted">
            Indicative quote · adjust the telematics profile — DriveScore and premium re-rate live on the backend.
          </div>
        </div>
        <span className="text-muted text-sm">Underwriting · rating workbench</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telematics profile (the levers) */}
        <div className="card p-8">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-lg font-semibold">Telematics profile</h2>
            <span className="text-muted text-xs">90-day driving signals</span>
          </div>
          {SLIDERS.map((s) => (
            <div key={s.key} className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="font-medium">{s.label}</span>
                <span className="tabular-nums text-accent2 font-semibold">{s.format(tel[s.key])}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={tel[s.key]}
                onChange={(e) => onSlide(s.key, Number(e.target.value))}
                onMouseUp={handleRelease}
                onTouchEnd={handleRelease}
                style={
                  {
                    ["--pct" as any]: `${((tel[s.key] - s.min) / (s.max - s.min)) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          ))}
          <button
            className="mt-2 text-sm text-muted hover:text-accent2 underline"
            onClick={() => {
              setTel(INITIAL);
              setLastChanged(null);
              getPrice(INITIAL, META).then((p) => {
                setPrice(p);
                runExplain(p, null);
              });
            }}
          >
            Reset to applicant profile (SUV · age 29)
          </button>
        </div>

        {/* Quote: score + indicative premium */}
        <div className="card p-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="flex justify-center">{price && <Gauge score={price.drivescore} band={price.band} />}</div>
            <div>
              {tier && (
                <span
                  className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: `${theme.color.accent}14`, border: `1px solid ${theme.color.accent}44`, color: theme.color.accent2 }}
                >
                  {tier.label}
                </span>
              )}
              {pv && <RatingBreakdown pv={pv} />}
            </div>
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold mb-4">Rating factor breakdown</h2>
          {price && <FactorBars factors={price.factors} topN={5} />}
        </div>

        {/* AI rationale */}
        <div className="card p-8 flex flex-col">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span style={{ color: theme.color.accent }}>◆</span> Underwriting rationale
          </h2>
          <StreamingText text={explainText} streaming={streaming} />
        </div>
      </div>

      <p className="text-muted text-xs mt-6 leading-relaxed">
        Indicative quote only — not a binding offer. Final premium subject to underwriting, declarations and
        verification of telematics data. Comprehensive cover, Singapore. NCD {QUOTE_NCD}% applied.
      </p>
    </div>
  );
}
