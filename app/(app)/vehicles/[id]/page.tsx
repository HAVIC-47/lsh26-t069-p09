import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Gauge,
  TrendingUp,
  Wallet,
  History,
  Phone,
} from "lucide-react";
import { loadCase } from "@/lib/data";
import { can, requireUser } from "@/lib/auth";
import { analyse, dailyRun } from "@/lib/engine";
import { healthScore, HEALTH_RULE } from "@/lib/scoring";
import { formatDate } from "@/lib/dates";
import { km as fmtKm, taka } from "@/lib/format";
import { StatusBadge, Tag } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { InspectionSummary } from "@/components/ui/HealthDot";
import { Card, CardHeader } from "@/components/ui/Card";
import { Reveal } from "@/components/motion/Reveal";
import { RecordServiceForm } from "@/components/RecordServiceForm";
import { OdometerForm } from "@/components/OdometerForm";
import { WorkshopDate } from "@/components/WorkshopDate";

export const dynamic = "force-dynamic";

const RULE_LABEL: Record<string, string> = {
  fixed_date: "Fixed date",
  period_months: "Time based",
  distance_km: "Distance based",
};

export default async function VehiclePage({ params }: PageProps<"/vehicles/[id]">) {
  const { id } = await params;
  await requireUser();
  const showMoney = await can("viewMoney");
  const canRecord = await can("recordService");
  const canOdometer = await can("updateOdometer");

  const workshop = await loadCase();
  const vehicle = workshop.vehicles.find((v) => v.id === id);
  if (!vehicle) notFound();

  const owner = workshop.owners.find((o) => o.id === vehicle.owner_id);
  const items = analyse(workshop)
    .filter((r) => r.vehicleId === id)
    .sort((a, b) => b.urgency - a.urgency);

  const { rate, last, span, first } = dailyRun(vehicle);
  const health = healthScore(items, vehicle.inspection);
  const overdue = items.filter((i) => i.status === "overdue");
  const dueValue = items
    .filter((i) => i.status !== "fine")
    .reduce((n, i) => n + i.cost, 0);

  const history = [...vehicle.service_history].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date)
  );

  return (
    <div className="space-y-5">
      <header>
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-1.5 text-sm text-accent transition-colors duration-200 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          All vehicles
        </Link>
        <h1 className="mt-2 nums text-2xl font-semibold tracking-tight">
          {vehicle.plate}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <WorkshopDate today={workshop.today} />
          <span>{vehicle.model}</span>
          {owner && (
            <>
              {/* Separator travels with the name so it never dangles at a wrap. */}
              <span>
                <span aria-hidden="true" className="mr-2">
                  ·
                </span>
                {owner.name}
              </span>
              <a
                href={`tel:${owner.phone}`}
                className="inline-flex items-center gap-1 nums text-accent hover:underline"
              >
                <Phone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {owner.phone}
              </a>
            </>
          )}
        </div>
      </header>

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-5">
          <HealthGauge score={health} size={92} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Vehicle health</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span>Recent inspection</span>
              <InspectionSummary inspection={vehicle.inspection} />
              {vehicle.inspection && (
                <span className="text-faint">
                  on {formatDate(vehicle.inspection.date)}
                </span>
              )}
            </p>
            <p className="mt-2 text-xs text-muted">{HEALTH_RULE}</p>
          </div>
        </div>
      </Card>

      <Reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Odometer"
          value={last.km}
          hint={formatDate(last.date)}
          icon={Gauge}
        />
        <KpiCard
          label="Daily running (km)"
          value={Math.round(rate)}
          hint={`${fmtKm(last.km - first.km)} over ${span} days`}
          icon={TrendingUp}
        />
        <KpiCard
          label="Overdue items"
          value={overdue.length}
          tone="overdue"
          icon={AlertTriangle}
        />
        {showMoney && (
          <KpiCard
            label="Work waiting"
            value={dueValue}
            format="taka"
            tone="accent"
            icon={Wallet}
          />
        )}
      </Reveal>

      <Card padded={false}>
        <CardHeader
          title="Service items"
          hint="Each item dated by its own rule, most urgent first"
        />
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.itemName} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium">{it.itemName}</span>
                <Tag>{RULE_LABEL[it.rule]}</Tag>
                <StatusBadge status={it.status} daysUntil={it.daysUntil} />
                <span className="nums text-xs text-muted">
                  {formatDate(it.due)}
                </span>
                <span className="ml-auto flex items-center gap-3">
                  {showMoney && (
                    <span className="nums text-sm">{taka(it.cost)}</span>
                  )}
                  {canRecord && (
                    <RecordServiceForm
                      vehicleId={vehicle.id}
                      itemName={it.itemName}
                      rule={it.rule}
                    />
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{it.basis}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card padded={false}>
          <CardHeader title="Service history" />
          {history.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
              <History className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              No work recorded on this vehicle yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((h, i) => (
                <li
                  key={`${h.item}-${h.date}-${i}`}
                  className="flex items-baseline gap-2 px-4 py-2 text-sm"
                >
                  <span className="font-medium">{h.item}</span>
                  <span className="nums text-xs text-muted">
                    {formatDate(h.date)}
                  </span>
                  {h.km != null && (
                    <span className="nums text-xs text-muted">{fmtKm(h.km)}</span>
                  )}
                  {showMoney && (
                    <span className="ml-auto nums">
                      {taka(parseFloat(h.cost_bdt))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded={false}>
          <CardHeader
            title="Update odometer"
            hint="Re-derives daily running for every distance-based estimate"
          />
          <div className="space-y-3 px-4 py-3">
            {canOdometer ? (
              <OdometerForm vehicleId={vehicle.id} currentKm={last.km} />
            ) : (
              <p className="text-xs text-muted">
                Odometer readings are taken by workshop staff.
              </p>
            )}
            <ul className="space-y-1 pt-1 nums text-xs text-muted">
              {[...vehicle.odometer_readings]
                .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                .slice(0, 5)
                .map((r) => (
                  <li key={r.date}>
                    {r.date} · {fmtKm(r.km)}
                  </li>
                ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
