import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { can, requireRole } from "@/lib/auth";
import { loadCase } from "@/lib/data";
import { analyse, dailyRun } from "@/lib/engine";
import { healthScore, HEALTH_RULE } from "@/lib/scoring";
import { formatDate } from "@/lib/dates";
import { taka } from "@/lib/format";
import { dueLabel } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { WorkshopDate } from "@/components/WorkshopDate";
import type { FindingRow, ServiceItemRow } from "./ServiceForm";
import { ServiceWorkspace, type VehicleMeta } from "./ServiceWorkspace";

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

  // Points the latest inspection raised, for every vehicle that still has an
  // outstanding one — a service clears them, so this list is only live work.
  const findings: FindingRow[] = workshop.vehicles.flatMap((v) =>
    (v.inspection?.points ?? []).map((pt) => ({
      vehicleId: v.id,
      point: pt.point,
      verdict: pt.verdict,
    }))
  );

  // Health and history for every vehicle, so the panel beside the form can
  // follow the picker without a round trip. The scoring stays on the server.
  const meta: Record<string, VehicleMeta> = {};
  for (const v of workshop.vehicles) {
    meta[v.id] = {
      health: healthScore(
        rows.filter((r) => r.vehicleId === v.id),
        v.inspection
      ),
      inspection: v.inspection
        ? {
            attention: v.inspection.attention,
            fail: v.inspection.fail,
            date: v.inspection.date,
          }
        : null,
      history: [...v.service_history]
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .slice(0, 8)
        .map((h) => ({
          item: h.item,
          date: h.date,
          cost: parseFloat(h.cost_bdt),
        })),
    };
  }

  const chosen = vehicles.find((v) => v.id === preselect) ?? vehicles[0];

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
        <ServiceWorkspace
          vehicles={vehicles}
          items={items}
          findings={findings}
          meta={meta}
          defaultVehicle={chosen?.id}
          showMoney={showMoney}
          healthRule={HEALTH_RULE}
        />
      )}
    </div>
  );
}
