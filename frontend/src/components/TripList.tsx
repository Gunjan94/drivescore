import { theme, getMode } from "../theme";
import { scoreColor } from "../theme";
import type { Trip, TripEvent } from "../trips";

// Night uses indigo; darkened in light mode so the chip text passes WCAG AA.
function eventColor(type: TripEvent["type"]): string {
  switch (type) {
    case "hard_brake":
    case "speeding":
      return theme.color.bad;
    case "harsh_corner":
      return theme.color.warn;
    case "night":
      return getMode() === "light" ? "#4338CA" : "#A5B4FC";
  }
}

/** Recent-trips feed, like a real telematics app's trip history. */
export function TripList({ trips }: { trips: Trip[] }) {
  return (
    <div className="flex flex-col gap-2">
      {trips.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-4 px-4 py-3 rounded-xl"
          style={{ background: theme.color.panel2, border: `1px solid ${theme.color.line}` }}
        >
          <div className="text-center w-12 shrink-0">
            <div className="text-xs text-muted">{t.day}</div>
            <div className="text-sm font-semibold">{t.date.split(" ")[0]}</div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {t.from} → {t.to}
            </div>
            <div className="text-xs text-muted">
              {t.time} · {t.km} km
              {t.events.length > 0 && (
                <span className="ml-2 inline-flex gap-1 flex-wrap">
                  {t.events.map((e, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ color: eventColor(e.type), background: `${eventColor(e.type)}1A` }}
                    >
                      {e.label}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-lg font-bold tabular-nums" style={{ color: scoreColor(t.score) }}>
              {t.score}
            </div>
            <div className="text-[10px] text-muted">trip score</div>
          </div>
        </div>
      ))}
    </div>
  );
}
