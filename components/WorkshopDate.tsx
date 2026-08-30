import { CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/dates";

/**
 * The workshop's "today" is a field on the dataset, not the server clock, so
 * the same due dates appear whenever the demo is opened. Shown on every page
 * because every date on screen is measured from it.
 */
export function WorkshopDate({ today }: { today: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-muted">
      <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      Workshop date
      <span className="nums text-text">{formatDate(today)}</span>
    </span>
  );
}
