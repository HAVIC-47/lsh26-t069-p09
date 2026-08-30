import type { Status } from "@/lib/types";

const STATUS_STYLES: Record<Status, string> = {
  overdue: "bg-overdue-bg text-overdue",
  due_soon: "bg-soon-bg text-soon",
  fine: "bg-fine-bg text-fine",
};

/** Turns the raw day count into the phrase a service adviser would say. */
export function dueLabel(status: Status, daysUntil: number) {
  if (status === "overdue") {
    const d = Math.abs(daysUntil);
    return d === 0 ? "Due today" : `${d} day${d === 1 ? "" : "s"} overdue`;
  }
  if (daysUntil === 0) return "Due today";
  return `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
}

export function StatusBadge({
  status,
  daysUntil,
}: {
  status: Status;
  daysUntil: number;
}) {
  return (
    <span
      className={`nums inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {dueLabel(status, daysUntil)}
    </span>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "accent";
}) {
  const styles = {
    neutral: "bg-surface-2 text-muted",
    primary: "bg-accent-soft text-text",
    accent: "bg-accent-soft text-accent",
  }[tone];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles}`}>
      {children}
    </span>
  );
}
