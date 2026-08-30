import type { LucideIcon } from "lucide-react";
import { CountUp, type CountFormat } from "@/components/motion/CountUp";

export function KpiCard({
  label,
  value,
  format = "number",
  hint,
  tone = "plain",
  icon: Icon,
}: {
  label: string;
  value: number;
  format?: CountFormat;
  hint?: string;
  tone?: "plain" | "overdue" | "soon" | "fine" | "accent";
  icon?: LucideIcon;
}) {
  const toneClass = {
    plain: "text-text",
    overdue: "text-overdue",
    soon: "text-soon",
    fine: "text-fine",
    accent: "text-accent",
  }[tone];

  return (
    <div
      data-reveal
      className="rounded-xl border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon className="h-3.5 w-3.5 text-muted" strokeWidth={2} aria-hidden="true" />
        )}
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${toneClass}`}>
        <CountUp value={value} format={format} />
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}
