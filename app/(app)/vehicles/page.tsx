import Link from "next/link";
import { Car, Search } from "lucide-react";
import { loadCase } from "@/lib/data";
import { can, requireRole } from "@/lib/auth";
import { analyse, dailyRun } from "@/lib/engine";
import { healthScore } from "@/lib/scoring";
import { km as fmtKm, taka } from "@/lib/format";
import { Empty } from "@/components/ui/Empty";
import { HealthDot, InspectionSummary } from "@/components/ui/HealthDot";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Card, CardHeader } from "@/components/ui/Card";
import { AddVehicleForm } from "@/components/AddVehicleForm";
import { WorkshopDate } from "@/components/WorkshopDate";

export const dynamic = "force-dynamic";

export default async function VehiclesPage({ searchParams }: PageProps<"/vehicles">) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim();
  const needle = q.toLowerCase();

  await requireRole("viewServiceHistory");
  // A technician's interface carries no prices at all.
  const showMoney = await can("viewMoney");
  const canAddVehicle = await can("manageVehicles");

  const workshop = await loadCase();
  const rows = analyse(workshop);
  const owners = new Map(workshop.owners.map((o) => [o.id, o]));

  const vehicles = workshop.vehicles
    .map((v) => {
      const mine = rows.filter((r) => r.vehicleId === v.id);
      return {
        v,
        health: healthScore(mine, v.inspection),
        owner: owners.get(v.owner_id),
        overdue: mine.filter((r) => r.status === "overdue").length,
        soon: mine.filter((r) => r.status === "due_soon").length,
        value: mine.filter((r) => r.status !== "fine").reduce((n, r) => n + r.cost, 0),
        odo: dailyRun(v).last.km,
      };
    })
    .filter(
      (x) =>
        !needle ||
        x.v.plate.toLowerCase().includes(needle) ||
        x.v.model.toLowerCase().includes(needle) ||
        (x.owner?.name.toLowerCase().includes(needle) ?? false)
    )
    .sort((a, b) => b.overdue - a.overdue || b.value - a.value);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <WorkshopDate today={workshop.today} />
          <span>
            {workshop.vehicles.length} vehicles across {workshop.owners.length} owners
          </span>
        </div>
      </header>

      <form className="flex max-w-sm gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={2}
            aria-hidden="true"
          />
          <label className="sr-only" htmlFor="q">
            Search by plate, model or owner
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search plate, model or owner…"
            className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm placeholder:text-muted"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {canAddVehicle && (
        <Card padded={false} className="mb-6">
          <CardHeader
            title="Add a vehicle"
            hint="Registers the car with the standard service catalogue, dated from today"
          />
          <div className="px-5 py-5">
            <AddVehicleForm
              today={workshop.today}
              owners={workshop.owners.map((o) => ({ id: o.id, name: o.name }))}
            />
          </div>
        </Card>
      )}

      {vehicles.length === 0 ? (
        <Empty
          icon={Car}
          title="No vehicles match"
          body={`Nothing matched “${q}”. Try a plate number, model or owner name.`}
        />
      ) : (
        <Reveal>
          <div
            data-reveal
            className="overflow-x-auto rounded-2xl border border-border bg-surface"
          >
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Vehicle</th>
                  <th className="px-4 py-2.5 font-medium">Owner</th>
                  <th className="px-4 py-2.5 text-right font-medium">Odometer</th>
                  <th className="px-4 py-2.5 text-right font-medium">Health</th>
                  <th className="px-4 py-2.5 font-medium">Recent inspection</th>
                  <th className="px-4 py-2.5 text-right font-medium">Overdue</th>
                  <th className="px-4 py-2.5 text-right font-medium">Due soon</th>
                  {showMoney && (
                    <th className="px-4 py-2.5 text-right font-medium">Value</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicles.map((x) => (
                  <tr key={x.v.id} className="transition-colors duration-200 hover:bg-surface-2">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/vehicles/${x.v.id}`}
                        className="font-medium transition-colors duration-200 hover:text-accent"
                      >
                        {x.v.plate}
                      </Link>
                      <div className="text-xs text-muted">{x.v.model}</div>
                    </td>
                    <td className="px-4 py-2.5">{x.owner?.name}</td>
                    <td className="px-4 py-2.5 text-right nums text-xs">
                      {fmtKm(x.odo)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <HealthDot score={x.health} />
                    </td>
                    <td className="px-4 py-2.5">
                      <InspectionSummary inspection={x.v.inspection} />
                    </td>
                    <td className="px-4 py-2.5 text-right nums">
                      {x.overdue > 0 ? (
                        <span className="font-semibold text-overdue">{x.overdue}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right nums">
                      {x.soon > 0 ? (
                        <span className="font-semibold text-soon">{x.soon}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    {showMoney && (
                      <td className="px-4 py-2.5 text-right nums">
                        {x.value > 0 ? taka(x.value) : <span className="text-muted">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  );
}
