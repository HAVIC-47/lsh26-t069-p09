import Link from "next/link";
import {
  Warehouse,
  Gauge,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Hammer,
  Info,
  ChevronRight,
  Search,
} from "lucide-react";
import { can, requireRole } from "@/lib/auth";
import { loadCase } from "@/lib/data";
import { analyse, dailyRun } from "@/lib/engine";
import { healthScore } from "@/lib/scoring";
import { formatDate } from "@/lib/dates";
import { km as fmtKm } from "@/lib/format";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { OdometerForm } from "@/components/OdometerForm";
import { Reveal } from "@/components/motion/Reveal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { WorkshopDate } from "@/components/WorkshopDate";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due soon" },
] as const;

export default async function BayPage({ searchParams }: PageProps<"/bay">) {
  await requireRole("viewBayQueue");
  const canService = await can("recordService");

  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim();
  const needle = q.toLowerCase();
  const digits = needle.replace(/\D/g, "");
  const filter = typeof params.filter === "string" ? params.filter : "all";

  const workshop = await loadCase();
  const rows = analyse(workshop);
  const ownerName = new Map(workshop.owners.map((o) => [o.id, o.name]));

  // No check-in table exists yet, so the queue is derived: the vehicles with
  // work actually outstanding, worst first. Labelled honestly rather than
  // presented as a list of cars physically in the bay.
  const everything = workshop.vehicles
    .map((v) => {
      const items = rows.filter((r) => r.vehicleId === v.id);
      const overdue = items.filter((i) => i.status === "overdue");
      const soon = items.filter((i) => i.status === "due_soon");
      const { last, rate, estimated } = dailyRun(v);
      return {
        v,
        owner: ownerName.get(v.owner_id) ?? "Unknown owner",
        items,
        overdue,
        soon,
        last,
        rate,
        estimated,
        health: healthScore(items, v.inspection),
        worst: Math.min(...items.map((i) => i.daysUntil), Infinity),
      };
    })
    .filter((x) => x.overdue.length > 0 || x.soon.length > 0)
    .sort((a, b) => a.worst - b.worst);

  const queue = everything
    .filter((x) =>
      filter === "overdue"
        ? x.overdue.length > 0
        : filter === "due_soon"
          ? x.soon.length > 0
          : true
    )
    .filter((x) => {
      if (!needle) return true;
      const plate = x.v.plate.toLowerCase();
      return (
        plate.includes(needle) ||
        x.owner.toLowerCase().includes(needle) ||
        x.v.model.toLowerCase().includes(needle) ||
        // Digits alone should match a plate, so "156408" finds "Kha 15-6408".
        (digits.length >= 3 && plate.replace(/\D/g, "").includes(digits))
      );
    });

  const keep = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (filter !== "all") sp.set("filter", filter);
    for (const [k, v] of Object.entries(extra)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const str = sp.toString();
    return str ? `/bay?${str}` : "/bay";
  };

  const totalOverdue = rows.filter((r) => r.status === "overdue").length;
  const totalSoon = rows.filter((r) => r.status === "due_soon").length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Today&rsquo;s Vehicles</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <WorkshopDate today={workshop.today} />
          <span>Work outstanding across the fleet, worst first</span>
        </div>
      </header>

      <Reveal className="grid grid-cols-3 gap-3">
        <KpiCard label="Vehicles in queue" value={everything.length} icon={Warehouse} />
        <KpiCard label="Items overdue" value={totalOverdue} tone="overdue" icon={AlertTriangle} />
        <KpiCard label="Due soon" value={totalSoon} tone="soon" icon={Clock} />
      </Reveal>

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          Log the odometer as soon as you sit in the car. Every distance-based
          prediction on that vehicle is re-derived from it straight away.
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <form className="flex min-w-0 flex-1 gap-2 sm:max-w-sm">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint"
              strokeWidth={2}
              aria-hidden="true"
            />
            <label className="sr-only" htmlFor="q">
              Search by owner name, car number or model
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Owner, car number or model…"
              className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm placeholder:text-faint"
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

        <span className="ml-auto text-xs text-muted">
          {queue.length} of {everything.length}
        </span>
      </div>

      {queue.length === 0 ? (
        <Empty
          icon={Warehouse}
          title={q || filter !== "all" ? "Nothing matches" : "Nothing outstanding"}
          body={
            q
              ? `No vehicle in the queue matches “${q}”.`
              : filter !== "all"
                ? "No vehicle matches this filter."
                : "Every vehicle on the register is inside its service intervals."
          }
        />
      ) : (
        <Reveal className="space-y-4">
          {queue.map((x) => (
            <Card key={x.v.id} padded={false} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-4">
                <HealthGauge score={x.health} size={84} />

                <div className="min-w-0 flex-1">
                  <h2 className="nums text-lg font-semibold">{x.v.plate}</h2>
                  <p className="text-sm text-muted">
                    {x.v.model} · {x.owner}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      {fmtKm(x.last.km)} on {formatDate(x.last.date)}
                    </span>
                    <span>
                      {x.rate.toFixed(0)} km/day
                      {x.estimated && " (assumed — one reading only)"}
                    </span>
                  </p>
                </div>

                <div className="flex gap-2">
                  {x.overdue.length > 0 && (
                    <span className="rounded-lg bg-overdue-bg px-2.5 py-1 text-sm font-semibold text-overdue">
                      {x.overdue.length} overdue
                    </span>
                  )}
                  {x.soon.length > 0 && (
                    <span className="rounded-lg bg-soon-bg px-2.5 py-1 text-sm font-semibold text-soon">
                      {x.soon.length} due soon
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-2">
                <div className="lg:border-r lg:border-border">
                  <CardHeader title="Log odometer at intake" />
                  <div className="px-4 py-4">
                    {/* Deliberately the largest control on the card. */}
                    <OdometerForm vehicleId={x.v.id} currentKm={x.last.km} />
                  </div>
                </div>

                <div>
                  <CardHeader title="What is due" />
                  <ul className="divide-y divide-border">
                    {[...x.overdue, ...x.soon].slice(0, 5).map((it) => (
                      <li
                        key={it.itemName}
                        className="flex flex-wrap items-baseline gap-x-2 px-4 py-2.5 text-sm"
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                            it.status === "overdue" ? "bg-overdue" : "bg-soon"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{it.itemName}</span>
                        <span className="text-xs text-muted">
                          {it.status === "overdue"
                            ? `${Math.abs(it.daysUntil)} days overdue`
                            : `in ${it.daysUntil} days`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
                    {/* Recording the work is the primary action, so it leads. */}
                    {canService && (
                      <Link
                        href={`/bay/service?vehicle=${x.v.id}`}
                        className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-on-primary transition-opacity duration-200 hover:opacity-88"
                      >
                        <Hammer className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                        Service
                      </Link>
                    )}
                    <Link
                      href={`/bay/inspect?vehicle=${x.v.id}`}
                      className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors duration-200 hover:border-border-strong hover:text-text"
                    >
                      <ClipboardCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      Inspect
                    </Link>
                    <Link
                      href={`/vehicles/${x.v.id}`}
                      className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors duration-200 hover:border-border-strong hover:text-text"
                    >
                      Service history
                      <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </Reveal>
      )}
    </div>
  );
}
