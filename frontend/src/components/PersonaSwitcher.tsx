import { theme } from "../theme";

type TagColor = "good" | "bad" | "muted";

/** The three demo personas the walkthrough narrates. */
export const PERSONAS: { id: string; name: string; tag: string; tagColor: TagColor }[] = [
  { id: "D0001", name: "Sarah Chen", tag: "Safe · overcharged", tagColor: "good" },
  { id: "D0002", name: "Marcus Reid", tag: "Risky · underpriced", tagColor: "bad" },
  { id: "D0003", name: "Priya N.", tag: "Average · overpaying", tagColor: "muted" },
];

/** Segmented control to switch the active driver in the dashboard. */
export function PersonaSwitcher({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PERSONAS.map((p) => {
        const isActive = p.id === active;
        const tagColor =
          p.tagColor === "good" ? theme.color.good : p.tagColor === "bad" ? theme.color.bad : theme.color.muted;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="px-4 py-2.5 rounded-xl text-left transition-colors"
            style={{
              minHeight: theme.touch.minTarget,
              background: isActive ? theme.color.panel2 : "transparent",
              border: `1px solid ${isActive ? theme.color.accent : theme.color.line}`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: tagColor }} />
              <span className="font-semibold text-sm" style={{ color: isActive ? theme.color.text : theme.color.muted }}>
                {p.name}
              </span>
            </div>
            <div className="text-[11px] text-muted mt-0.5 ml-4">{p.tag}</div>
          </button>
        );
      })}
    </div>
  );
}
