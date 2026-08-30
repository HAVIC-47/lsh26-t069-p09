import Link from "next/link";
import {
  CalendarRange,
  Package,
  UserMinus,
  Wallet,
  AlertTriangle,
  Info,
  Phone,
} from "lucide-react";
import { loadCase } from "@/lib/data";
import { analyse } from "@/lib/engine";
import {
  churnRisk,
  partsRequisition,
  weeklyBuckets,
  CHURN_DAYS,
} from "@/lib/scoring";
import { taka } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { ForecastChart } from "@/components/ui/ForecastChart";
import { Reveal } from "@/components/motion/Reveal";
import { WorkshopDate } from "@/components/WorkshopDate";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const workshop = await loadCase();
  const rows = analyse(workshop);
  const forecast = weeklyBuckets(rows, workshop.today, 8);
  const churn = churnRisk(rows);

  const upcomingRevenue = forecast.buckets.reduce((n, b) => n + b.revenue, 0);
  const busiest = forecast.buckets.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  const nextFourWeeksParts = partsRequisition(
    forecast.buckets.slice(0, 4).flatMap((b) => b.items)
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Fleet Analytics</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <WorkshopDate today={workshop.today} />
          <span>Capacity, parts and retention across {workshop.vehicles.length} vehicles</span>
        </div>
      </header>

      <Reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Backlog now"
          value={forecast.backlog.length}
          hint={`${taka(forecast.backlogRevenue)} overdue`}
          tone="overdue"
          icon={AlertTriangle}
        />
        <KpiCard
          label="Booked in 8 weeks"
          value={upcomingRevenue}
          format="taka"
          hint="upcoming work only"
          tone="accent"
          icon={Wallet}
        />
        {/* Label names the unit: a bare "7" under "Busiest week" reads as week 7. */}
        <KpiCard
          label="Peak week vehicles"
          value={busiest.vehicles}
          hint={`week ${busiest.index}, from ${formatDate(busiest.start)}`}
          icon={CalendarRange}
        />
        <KpiCard
          label="At risk of churn"
          value={churn.length}
          hint={`over ${CHURN_DAYS} days lapsed`}
          tone="overdue"
          icon={UserMinus}
        />
      </Reveal>

      <Card padded={false}>
        <CardHeader
          title="8-week workload and revenue forecast"
          hint="Upcoming work only — the overdue backlog is counted separately so it cannot inflate week 1"
        />
        <div className="px-4 py-4">
          <ForecastChart buckets={forecast.buckets} peak={forecast.peakRevenue} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card padded={false}>
          <CardHeader
            title="Parts requisition — next 4 weeks"
            hint="What to have in stock before the work arrives"
          />
          {nextFourWeeksParts.length === 0 ? (
            <div className="p-4">
              <Empty
                icon={Package}
                title="Nothing scheduled"
                body="No work falls in the next four weeks."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {nextFourWeeksParts.map((p) => (
                <li
                  key={p.name}
                  className="flex items-baseline gap-3 px-4 py-2 text-sm"
                >
                  <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                    {p.count}×
                  </span>
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-auto font-mono tabular-nums">{taka(p.cost)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-xs text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>
              A requirement list, not a stock report. The dataset carries no
              inventory levels, so nothing here is reconciled against what the
              workshop actually holds.
            </span>
          </p>
        </Card>

        <Card padded={false}>
          <CardHeader
            title="At risk of churn"
            hint={`Predicted service passed over ${CHURN_DAYS} days ago with nothing recorded since`}
          />
          {churn.length === 0 ? (
            <div className="p-4">
              <Empty
                icon={UserMinus}
                title="No lapsed customers"
                body="Every vehicle has been seen inside its service window."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {churn.slice(0, 12).map((e) => (
                <li key={e.vehicleId} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    <Link
                      href={`/vehicles/${e.vehicleId}`}
                      className="font-medium transition-colors duration-200 hover:text-primary"
                    >
                      {e.ownerName}
                    </Link>
                    <a
                      href={`tel:${e.ownerPhone}`}
                      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                      {e.ownerPhone}
                    </a>
                    <span className="ml-auto font-mono tabular-nums">{taka(e.value)}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-muted">
                    {e.plate} · {Math.abs(e.worstDays)} days lapsed ·{" "}
                    {e.items.length} item{e.items.length === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {churn.length > 12 && (
            <p className="border-t border-border px-4 py-2 text-xs text-muted">
              Showing 12 of {churn.length}.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
