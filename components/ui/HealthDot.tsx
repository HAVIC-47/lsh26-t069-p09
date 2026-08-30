import { healthBand } from "@/lib/scoring";
import type { InspectionFlags } from "@/lib/types";

const TONE = {
  fine: "bg-fine text-fine",
  due_soon: "bg-soon text-soon",
  overdue: "bg-overdue text-overdue",
} as const;

/** Compact health readout for a table row — colour is never the only signal. */
export function HealthDot({ score }: { score: number }) {
  const tone = TONE[healthBand(score)];
  const [dot, text] = tone.split(" ");
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className={`nums text-[13px] font-semibold ${text}`}>{score}</span>
    </span>
  );
}

/** What the last inspection raised, or a dash when there is nothing outstanding. */
export function InspectionSummary({
  inspection,
  className = "",
}: {
  inspection?: InspectionFlags;
  className?: string;
}) {
  if (!inspection) {
    return <span className={`text-faint ${className}`}>—</span>;
  }
  const parts = [
    inspection.attention > 0 ? `${inspection.attention} attention` : "",
    inspection.fail > 0 ? `${inspection.fail} fail` : "",
  ].filter(Boolean);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-soon-bg px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-soon ${className}`}
    >
      {parts.join(", ")}
    </span>
  );
}
