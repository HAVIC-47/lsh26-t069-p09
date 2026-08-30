import Link from "next/link";
import { AlertTriangle, Clock, PhoneCall, Wallet, Search, Info } from "lucide-react";
import { loadCase } from "@/lib/data";
import { can, requireRole } from "@/lib/auth";
import { analyse, buildCallList, SOON_DAYS } from "@/lib/engine";
import { PRIORITY_RULE } from "@/lib/scoring";
import { reminderMessage, whatsappLink } from "@/lib/messages";
import { formatDate } from "@/lib/dates";
import { taka } from "@/lib/format";
import { ReminderPanel } from "@/components/ReminderPanel";
import { StatusBadge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { Empty } from "@/components/ui/Empty";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { WorkshopDate } from "@/components/WorkshopDate";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "Everything due" },
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due soon" },
] as const;

export default async function CallDeskPage({ searchParams }: PageProps<"/desk">) {
  const params = await searchParams;
  const filter = typeof params.filter === "string" ? params.filter : "all";
  const q = (typeof params.q === "string" ? params.q : "").trim();
  const needle = q.toLowerCase();

  await requireRole("viewCallDesk");
  const canRemind = await can("sendReminders");
  const workshop = await loadCase();
  const rows = analyse(workshop);
  // No call history yet — every customer scores as never contacted, which is
  // the truth until dispositions are being logged.
  const all = buildCallList(rows, workshop.today);

  const entries = all
    .map((e) =>
      filter === "all"
        ? e
        : { ...e, items: e.items.filter((i) => i.status === filter) }
    )
    .filter((e) => e.items.length > 0)
    .filter(
      (e) =>
        !needle ||
        e.ownerName.toLowerCase().includes(needle) ||
        e.plate.toLowerCase().includes(needle) ||
        e.model.toLowerCase().includes(needle)
    );

  const overdue = rows.filter((r) => r.status === "overdue");
  const soon = rows.filter((r) => r.status === "due_soon");
  const revenueAtRisk = [...overdue, ...soon].reduce((n, r) => n + r.cost, 0);

  const keep = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (filter !== "all") sp.set("filter", filter);
    for (const [k, v] of Object.entries(extra)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const s = sp.toString();
    return s ? `/desk?${s}` : "/desk";
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Call Desk</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <WorkshopDate today={workshop.today} />
          <span>
            {workshop.vehicles.length} vehicles · {workshop.owners.length} owners ·
            every item dated by its own rule
          </span>
        </div>
      </header>

      <Reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Overdue items"
          value={overdue.length}
          tone="overdue"
          icon={AlertTriangle}
        />
        <KpiCard
          label="Due soon"
          value={soon.length}
          hint={`within ${SOON_DAYS} days`}
          tone="soon"
          icon={Clock}
        />
        <KpiCard
          label="Owners to call"
          value={new Set(all.map((e) => e.ownerId)).size}
          icon={PhoneCall}
        />
        <KpiCard
          label="Revenue at risk"
          value={revenueAtRisk}
          format="taka"
          hint="overdue + due soon"
          tone="accent"
          icon={Wallet}
        />
      </Reveal>

      <div className="flex flex-wrap items-center gap-2">
        <form className="flex min-w-0 flex-1 gap-2 sm:max-w-sm">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
              strokeWidth={2}
              aria-hidden="true"
            />
            <label className="sr-only" htmlFor="q">
              Search owner, plate or model
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Search owner, plate or model…"
              className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm placeholder:text-muted"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <ButtonLink
              key={f.key}
              href={keep({ filter: f.key === "all" ? "" : f.key })}
              size="sm"
              variant={filter === f.key ? "primary" : "secondary"}
            >
              {f.label}
            </ButtonLink>
          ))}
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          <span className="font-medium text-text">How this list is ordered — </span>
          {PRIORITY_RULE}
        </span>
      </p>

      {entries.length === 0 ? (
        <Empty
          icon={PhoneCall}
          title="Nothing to call about"
          body={
            q
              ? `No vehicle matches “${q}” under this filter.`
              : "No vehicle matches this filter. Every item is inside its service interval."
          }
        />
      ) : (
        <Reveal>
          <ol className="space-y-3">
            {entries.map((e, i) => (
              <li
                key={e.vehicleId}
                data-reveal
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <div className="flex flex-wrap items-start gap-3 border-b border-border px-4 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft nums text-xs font-semibold text-accent ">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{e.ownerName}</div>
                    <a
                      href={`tel:${e.ownerPhone}`}
                      className="nums text-sm text-accent hover:underline"
                    >
                      {e.ownerPhone}
                    </a>
                  </div>
                  <div className="min-w-0 text-sm sm:text-right">
                    <Link
                      href={`/vehicles/${e.vehicleId}`}
                      className="font-medium transition-colors duration-200 hover:text-accent"
                    >
                      {e.plate}
                    </Link>
                    <div className="text-muted">{e.model}</div>
                  </div>
                  <div className="text-sm sm:min-w-24 sm:text-right">
                    <div className="nums font-semibold">
                      {taka(e.totalCost)}
                    </div>
                    <div className="text-muted">
                      {e.items.length} item{e.items.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div
                    className="text-sm sm:min-w-20 sm:text-right"
                    title={PRIORITY_RULE}
                  >
                    <div className="nums font-semibold text-accent ">
                      {e.priority}
                    </div>
                    <div className="text-muted">priority</div>
                  </div>
                </div>

                <ul className="divide-y divide-border">
                  {e.items.map((it) => (
                    <li key={it.itemName} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-medium">{it.itemName}</span>
                        <StatusBadge status={it.status} daysUntil={it.daysUntil} />
                        <span className="nums text-xs text-muted">
                          {formatDate(it.due)}
                        </span>
                        <span className="ml-auto nums text-sm">
                          {taka(it.cost)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{it.basis}</p>
                    </li>
                  ))}
                </ul>

                {canRemind && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2/50 px-4 py-2.5">
                  <ReminderPanel
                    ownerName={e.ownerName}
                    messageEn={reminderMessage({
                      ownerName: e.ownerName,
                      model: e.model,
                      plate: e.plate,
                      items: e.items,
                      lang: "en",
                    })}
                    messageBn={reminderMessage({
                      ownerName: e.ownerName,
                      model: e.model,
                      plate: e.plate,
                      items: e.items,
                      lang: "bn",
                    })}
                    waEn={whatsappLink(
                      e.ownerPhone,
                      reminderMessage({
                        ownerName: e.ownerName,
                        model: e.model,
                        plate: e.plate,
                        items: e.items,
                        lang: "en",
                      })
                    )}
                    waBn={whatsappLink(
                      e.ownerPhone,
                      reminderMessage({
                        ownerName: e.ownerName,
                        model: e.model,
                        plate: e.plate,
                        items: e.items,
                        lang: "bn",
                      })
                    )}
                  />
                </div>
                )}
              </li>
            ))}
          </ol>
        </Reveal>
      )}
    </div>
  );
}
