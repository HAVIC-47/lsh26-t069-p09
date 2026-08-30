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
    plain: "text-heading",
    overdue: "text-overdue",
    soon: "text-soon",
    fine: "text-fine",
    accent: "text-accent",
  }[tone];

  return (
    <div
      data-reveal
      className="rounded-2xl border border-border bg-surface px-4 py-4 transition-colors duration-200 hover:border-border-strong"
    >
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon className="h-3.5 w-3.5 text-faint" strokeWidth={2} aria-hidden="true" />
        )}
        <span className="eyebrow">{label}</span>
      </div>
      <div className={`nums mt-2 text-[26px] leading-none font-semibold ${toneClass}`}>
        <CountUp value={value} format={format} />
      </div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </div>
  );
}
