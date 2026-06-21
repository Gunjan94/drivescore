import { theme } from "../theme";
import { INSURER, type Policy, sgd } from "../domain";

/** A real-looking motor policy summary card (SG comprehensive cover). */
export function PolicyCard({ policy }: { policy: Policy }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-muted text-xs tracking-widest uppercase">{INSURER}</div>
          <div className="font-semibold text-lg">{policy.cover} Motor</div>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.color.good, background: `${theme.color.good}14`, border: `1px solid ${theme.color.good}44` }}
        >
          ● {policy.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
        <Field label="Policy no." value={policy.number} mono />
        <Field label="Vehicle" value={policy.vehicle} />
        <Field label="Reg. plate" value={policy.plate} mono />
        <Field label="No Claims Discount" value={`${policy.ncd}%`} accent />
        <Field label="Excess" value={sgd(policy.excess)} />
        <Field
          label="Cover period"
          value={`${policy.effective} – ${policy.renewal}`}
        />
      </div>

      {policy.youngDriverExcess > 0 && (
        <div className="mt-4 text-xs text-muted">
          + Young/inexperienced driver excess {sgd(policy.youngDriverExcess)} applies per claim.
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div>
      <div className="text-muted text-xs mb-0.5">{label}</div>
      <div
        className={"font-semibold " + (mono ? "tabular-nums " : "")}
        style={accent ? { color: theme.color.accent2 } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
