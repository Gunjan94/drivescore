import { useState } from "react";
import { DriverDashboard } from "./views/DriverDashboard";
import { PricingEngine } from "./views/PricingEngine";
import { UnderwriterConsole } from "./views/UnderwriterConsole";
import { theme, getMode, toggleMode, type Mode } from "./theme";

type View = "dashboard" | "pricing" | "console";

const TABS: { id: View; label: string }[] = [
  { id: "dashboard", label: "Driver Dashboard" },
  { id: "pricing", label: "Live Pricing Engine" },
  { id: "console", label: "Underwriter Console" },
];

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [mode, setMode] = useState<Mode>(getMode());

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{ borderBottom: `1px solid ${theme.color.line}`, background: "var(--header-bg)" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: theme.color.accent, color: theme.color.ink, boxShadow: "var(--card-shadow)" }}
            >
              <GaugeMark />
            </div>
            <div>
              <div className="font-bold text-xl leading-none tracking-tight">
                Drive<span style={{ color: theme.color.accent2 }}>Score</span>
                <span className="text-muted font-medium text-base">  ·  Meridian Motor</span>
              </div>
              <div className="text-muted text-xs mt-1 tracking-wide">
                Usage-based motor insurance · Singapore
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-2">
              {TABS.map((t) => {
                const active = view === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    className="px-4 py-3 rounded-xl font-medium transition-colors"
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
            <button
              onClick={() => setMode(toggleMode())}
              aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
              className="rounded-xl flex items-center justify-center transition-colors"
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
        </div>
      </header>

      <main>
        {view === "dashboard" && <DriverDashboard />}
        {view === "pricing" && <PricingEngine />}
        {view === "console" && <UnderwriterConsole />}
      </main>
    </div>
  );
}

function GaugeMark() {
  // Speedometer mark — on-brand for a usage-based "DriveScore" product.
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
