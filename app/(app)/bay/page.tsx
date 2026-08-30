import Link from "next/link";
import {
  Warehouse,
  Gauge,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Info,
  ChevronRight,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
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
import { WorkshopDate } from "@/components/WorkshopDate";

export const dynamic = "force-dynamic";

export default async function BayPage() {
  await requireRole("viewBayQueue");

  const workshop = await loadCase();
  const rows = analyse(workshop);

  // No check-in table exists yet, so the queue is derived: the vehicles with
  // work actually outstanding, worst first. Labelled honestly rather than
  // presented as a list of cars physically in the bay.
  const queue = workshop.vehicles
    .map((v) => {
      const items = rows.filter((r) => r.vehicleId === v.id);
      const overdue = items.filter((i) => i.status === "overdue");
      const soon = items.filter((i) => i.status === "due_soon");
      const { last, rate, estimated } = dailyRun(v);
      return {
        v,
        items,
        overdue,
        soon,
        last,
        rate,
        estimated,
        health: healthScore(items),
        worst: Math.min(...items.map((i) => i.daysUntil), Infinity),
      };
    })
    .filter((x) => x.overdue.length > 0 || x.soon.length > 0)
    .sort((a, b) => a.worst - b.worst);

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
        <KpiCard label="Vehicles in queue" value={queue.length} icon={Warehouse} />
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

      {queue.length === 0 ? (
        <Empty
          icon={Warehouse}
          title="Nothing outstanding"
          body="Every vehicle on the register is inside its service intervals."
        />
      ) : (
        <Reveal className="space-y-4">
          {queue.map((x) => (
            <Card key={x.v.id} padded={false} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-4">
                <HealthGauge score={x.health} size={84} />

                <div className="min-w-0 flex-1">
                  <h2 className="nums text-lg font-semibold">{x.v.plate}</h2>
                  <p className="text-sm text-muted">{x.v.model}</p>
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
                    <Link
                      href={`/vehicles/${x.v.id}`}
                      className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors duration-200 hover:border-border-strong hover:text-text"
                    >
                      Service history
                      <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    </Link>
                    <Link
                      href={`/bay/inspect?vehicle=${x.v.id}`}
                      className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors duration-200 hover:border-border-strong hover:text-text"
                    >
                      <ClipboardCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      Inspect
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
