import { useState } from "react";
import { FleetCommand } from "./views/FleetCommand";
import { DriverDashboard } from "./views/DriverDashboard";
import { PricingEngine } from "./views/PricingEngine";
import { UnderwriterConsole } from "./views/UnderwriterConsole";
import { OPERATOR, INSURER } from "./fleet";
import { theme, getMode, toggleMode, type Mode } from "./theme";

type View = "fleet" | "driver" | "insurer" | "lab";

const TABS: { id: View; label: string; audience: "operator" | "insurer" | "shared" }[] = [
  { id: "fleet", label: "Fleet Command", audience: "operator" },
  { id: "driver", label: "Driver Detail", audience: "operator" },
  { id: "insurer", label: "Insurer View", audience: "insurer" },
  { id: "lab", label: "Rating Lab", audience: "shared" },
];

export default function App() {
  const [view, setView] = useState<View>("fleet");
  const [driverId, setDriverId] = useState("D0001");
  const [mode, setMode] = useState<Mode>(getMode());

  function openDriver(id: string) {
    setDriverId(id);
    setView("driver");
  }

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-[1000] backdrop-blur"
        style={{ borderBottom: `1px solid ${theme.color.line}`, background: "var(--header-bg)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Brand row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: theme.color.accent, color: theme.color.ink, boxShadow: "var(--card-shadow)" }}
              >
                <GaugeMark />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-lg sm:text-xl leading-none tracking-tight truncate">
                  Drive<span style={{ color: theme.color.accent2 }}>Score</span>
                  <span className="text-muted font-medium text-sm sm:text-base hidden sm:inline"> · Fleet Risk</span>
                </div>
                <div className="text-muted text-[11px] sm:text-xs mt-1 tracking-wide truncate">
                  {OPERATOR} <span className="opacity-60">insured by</span> {INSURER}
                </div>
              </div>
            </div>
            <button
              onClick={() => setMode(toggleMode())}
              aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
              className="rounded-xl flex items-center justify-center transition-colors shrink-0"
              style={{
                minHeight: theme.touch.minTarget,
                minWidth: theme.touch.minTarget,
                background: "transparent",
                color: theme.color.muted,
                border: `1px solid ${theme.color.line}`,
              }}
            >
              {mode === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          {/* Tab nav — horizontally scrollable on mobile */}
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
            {TABS.map((t) => {
              const active = view === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className="px-3 sm:px-4 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-sm sm:text-base shrink-0"
                  style={{
                    minHeight: theme.touch.minTarget,
                    background: active ? theme.color.accent : "transparent",
                    color: active ? theme.color.ink : theme.color.muted,
                    border: `1px solid ${active ? theme.color.accent : theme.color.line}`,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main>
        {view === "fleet" && <FleetCommand onOpenDriver={openDriver} />}
        {view === "driver" && <DriverDashboard driverId={driverId} onDriverChange={setDriverId} />}
        {view === "insurer" && <UnderwriterConsole onOpenDriver={openDriver} />}
        {view === "lab" && <PricingEngine />}
      </main>
    </div>
  );
}

function GaugeMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 18a9 9 0 1 1 17 0" />
      <path d="M12 13.5 16 8.5" />
      <circle cx="12" cy="13.8" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
