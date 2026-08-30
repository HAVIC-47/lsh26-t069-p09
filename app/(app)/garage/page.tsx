import Link from "next/link";
import { Car, CalendarPlus, Gauge, Receipt, Info } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { loadCase } from "@/lib/data";
import { analyse, dailyRun } from "@/lib/engine";
import { healthScore } from "@/lib/scoring";
import { formatDate } from "@/lib/dates";
import { km as fmtKm, taka } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { WorkshopDate } from "@/components/WorkshopDate";
import type { DueItem, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Traffic-light dot. Never colour alone — the label carries the meaning too. */
function Light({ status }: { status: Status }) {
  const cls = {
    overdue: "bg-overdue",
    due_soon: "bg-soon",
    fine: "bg-fine",
  }[status];
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} aria-hidden="true" />;
}

const GROUPS: { status: Status; title: string; blurb: string }[] = [
  { status: "overdue", title: "Overdue", blurb: "Booked in as soon as you can" },
  { status: "due_soon", title: "Due soon", blurb: "Worth planning for" },
  { status: "fine", title: "Healthy", blurb: "Nothing to do" },
];

export default async function GaragePage() {
  const profile = await requireRole("viewOwnGarage");

  // Row-level security already restricts this read to the signed-in owner's
  // vehicles; nothing here filters by hand.
  const workshop = await loadCase();
  const rows = analyse(workshop);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My Garage</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <WorkshopDate today={workshop.today} />
          <span>
            {profile.full_name} ·{" "}
            {workshop.vehicles.length === 1
              ? "1 vehicle"
              : `${workshop.vehicles.length} vehicles`}
          </span>
        </div>
      </header>

      {workshop.vehicles.length === 0 ? (
        <Empty
          icon={Car}
          title="No vehicles on your account yet"
          body="Ask the workshop to link your vehicle to this account, and it will appear here."
        />
      ) : (
        <Reveal className="space-y-5">
          {workshop.vehicles.map((v) => {
            const items = rows
              .filter((r) => r.vehicleId === v.id)
              .sort((a, b) => a.daysUntil - b.daysUntil);
            const score = healthScore(items);
            const { rate, last } = dailyRun(v);
            const dueValue = items
              .filter((i) => i.status !== "fine")
              .reduce((n, i) => n + i.cost, 0);
            const history = [...v.service_history].sort(
              (a, b) => Date.parse(b.date) - Date.parse(a.date)
            );

            const grouped = GROUPS.map((g) => ({
              ...g,
              items: items.filter((i) => i.status === g.status),
            })).filter((g) => g.items.length > 0);

            return (
              <Card key={v.id} padded={false} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-4">
                  <HealthGauge score={score} />
                  <div className="min-w-0 flex-1">
                    <h2 className="nums text-lg font-semibold">{v.plate}</h2>
                    <p className="text-sm text-muted">{v.model}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        {fmtKm(last.km)} on {formatDate(last.date)}
                      </span>
                      <span>about {rate.toFixed(0)} km a day</span>
                    </p>
                  </div>
                  <div className="text-sm sm:text-right">
                    {dueValue > 0 ? (
                      <>
                        <div className="nums font-semibold text-accent">
                          {taka(dueValue)}
                        </div>
                        <div className="text-xs text-muted">estimated, work due</div>
                      </>
                    ) : (
                      <div className="text-xs text-fine">Nothing due right now</div>
                    )}
                  </div>
                  <ButtonLink href="/garage/book" variant="primary" size="sm">
                    <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    Request service
                  </ButtonLink>
                </div>

                <div className="grid gap-0 lg:grid-cols-2">
                  <div className="lg:border-r lg:border-border">
                    {grouped.map((g) => (
                      <div key={g.status}>
                        <div className="flex items-baseline gap-2 border-b border-border bg-surface-2/50 px-4 py-2">
                          <Light status={g.status} />
                          <h3 className="text-sm font-semibold">{g.title}</h3>
                          <span className="text-xs text-muted">{g.blurb}</span>
                          <span className="ml-auto nums text-xs text-muted">
                            {g.items.length}
                          </span>
                        </div>
                        <ul className="divide-y divide-border">
                          {g.items.map((it: DueItem) => (
                            <li
                              key={it.itemName}
                              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-2.5 text-sm"
                            >
                              <span className="font-medium">{it.itemName}</span>
                              <span className="text-xs text-muted">
                                {it.status === "overdue"
                                  ? `${Math.abs(it.daysUntil)} days overdue`
                                  : it.status === "due_soon"
                                    ? `in ${it.daysUntil} days`
                                    : formatDate(it.due)}
                              </span>
                              <span className="ml-auto nums">
                                {taka(it.cost)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div>
                    <CardHeader title="Past visits" />
                    {history.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted">
                        No work recorded on this vehicle yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {history.slice(0, 8).map((h, i) => (
                          <li
                            key={`${h.item}-${h.date}-${i}`}
                            className="flex flex-wrap items-baseline gap-x-2 px-4 py-2 text-sm"
                          >
                            <Receipt
                              className="h-3.5 w-3.5 shrink-0 text-muted"
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            <span className="font-medium">{h.item}</span>
                            <span className="nums text-xs text-muted">
                              {formatDate(h.date)}
                            </span>
                            <span className="ml-auto nums">
                              {taka(parseFloat(h.cost_bdt))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </Reveal>
      )}

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          Costs shown are the workshop&rsquo;s catalogue estimates, not a final
          bill. Dates for distance-based parts are predictions from how far your
          car has been running — they move if your usage changes.{" "}
          <Link href="/garage/book" className="text-accent hover:underline">
            Request a service
          </Link>{" "}
          and the workshop will confirm.
        </span>
      </p>
    </div>
  );
}
