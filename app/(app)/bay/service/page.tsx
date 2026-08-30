import Link from "next/link";
import { ArrowLeft, Wrench, History, Info } from "lucide-react";
import { can, requireRole } from "@/lib/auth";
import { loadCase } from "@/lib/data";
import { analyse, dailyRun } from "@/lib/engine";
import { healthScore, HEALTH_RULE } from "@/lib/scoring";
import { formatDate } from "@/lib/dates";
import { taka } from "@/lib/format";
import { dueLabel } from "@/components/ui/Badge";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { Reveal } from "@/components/motion/Reveal";
import { WorkshopDate } from "@/components/WorkshopDate";
import { ServiceForm, type ServiceItemRow } from "./ServiceForm";

export const dynamic = "force-dynamic";

export default async function ServicePage({
  searchParams,
}: PageProps<"/bay/service">) {
  await requireRole("recordService");
  const showMoney = await can("viewMoney");

  const params = await searchParams;
  const preselect = typeof params.vehicle === "string" ? params.vehicle : undefined;

  const workshop = await loadCase();
  const rows = analyse(workshop);
  const ownerName = new Map(workshop.owners.map((o) => [o.id, o.name]));

  const vehicles = workshop.vehicles
    .map((v) => ({
      id: v.id,
      plate: v.plate,
      model: v.model,
      owner: ownerName.get(v.owner_id) ?? "Unknown owner",
      km: dailyRun(v).last.km,
    }))
    .sort((a, b) => a.plate.localeCompare(b.plate));

  // Every vehicle's items, so choosing a car in the picker is instant rather
  // than a page navigation — a technician on a tablet should not wait.
  const items: ServiceItemRow[] = rows.map((r) => ({
    vehicleId: r.vehicleId,
    name: r.itemName,
    status: r.status,
    label: dueLabel(r.status, r.daysUntil),
    cost: r.cost,
  }));

  const chosen = vehicles.find((v) => v.id === preselect) ?? vehicles[0];
  const chosenVehicle = workshop.vehicles.find((v) => v.id === chosen?.id);
  const chosenItems = rows.filter((r) => r.vehicleId === chosen?.id);
  const health = healthScore(chosenItems, chosenVehicle?.inspection);

  const recentHistory = chosenVehicle
    ? [...chosenVehicle.service_history]
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .slice(0, 8)
    : [];

  return (
    <div>
      <Link
        href="/bay"
        className="inline-flex items-center gap-1.5 text-[13px] text-accent transition-opacity duration-200 hover:opacity-75"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Today&rsquo;s vehicles
      </Link>

      <div className="mt-3">
        <PageHeader eyebrow="Workshop floor" title="Record a Service">
          <WorkshopDate today={workshop.today} />
          <span>
            Tick what was actually done — only those items reset, and the health
            score moves with them
          </span>
        </PageHeader>
      </div>

      {vehicles.length === 0 ? (
        <Empty
          icon={Wrench}
          title="No vehicles on the register"
          body="Add a vehicle before recording work against it."
        />
      ) : (
        <Reveal className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card data-reveal padded={false}>
            <CardHeader
              title="Job sheet"
              hint="Search for the car, tick the work, save"
            />
            <div className="px-5 py-5">
              <ServiceForm
                vehicles={vehicles}
                items={items}
                defaultVehicle={chosen?.id}
                showMoney={showMoney}
              />
            </div>
          </Card>

          <div className="space-y-6">
            <Card data-reveal>
              <div className="flex items-center gap-4">
                <HealthGauge score={health} size={92} />
                <div className="min-w-0">
                  <p className="eyebrow">Health before this job</p>
                  <p className="nums mt-1 text-[15px] font-semibold">
                    {chosen?.plate}
                  </p>
                  <p className="text-xs text-muted">
                    {chosen?.model} · {chosen?.owner}
                  </p>
                  {chosenVehicle?.inspection && (
                    <p className="mt-1.5 text-xs text-soon">
                      Inspection on {formatDate(chosenVehicle.inspection.date)} flagged{" "}
                      {chosenVehicle.inspection.attention} needing attention and{" "}
                      {chosenVehicle.inspection.fail} failed — recording a service
                      clears that penalty.
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
                {HEALTH_RULE}
              </p>
            </Card>

            <Card data-reveal padded={false}>
              <CardHeader title="Service history" hint="Newest first" />
              {recentHistory.length === 0 ? (
                <p className="flex items-center gap-2 px-5 py-6 text-[13px] text-muted">
                  <History className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  Nothing recorded on this vehicle yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentHistory.map((h, i) => (
                    <li
                      key={`${h.item}-${h.date}-${i}`}
                      className="flex flex-wrap items-baseline gap-2 px-5 py-2.5 text-[13px]"
                    >
                      <span className="font-medium">{h.item}</span>
                      <span className="nums text-xs text-faint">
                        {formatDate(h.date)}
                      </span>
                      {showMoney && (
                        <span className="nums ml-auto">
                          {taka(parseFloat(h.cost_bdt))}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>
                Saving writes one history row per ticked item, so each of those
                items is dated from today and nothing else moves. The customer
                sees the update in their garage immediately.
              </span>
            </p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
