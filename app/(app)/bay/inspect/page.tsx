import Link from "next/link";
import { ArrowLeft, ClipboardCheck, TriangleAlert, Info } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { loadCase } from "@/lib/data";
import { dailyRun } from "@/lib/engine";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { km as fmtKm } from "@/lib/format";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Tag } from "@/components/ui/Badge";
import { Reveal } from "@/components/motion/Reveal";
import { WorkshopDate } from "@/components/WorkshopDate";
import { ALL_POINTS } from "@/lib/inspection";
import { InspectionForm } from "./InspectionForm";

export const dynamic = "force-dynamic";

type InspectionRow = {
  id: number;
  vehicle_id: string;
  odometer: number | null;
  note: string | null;
  created_at: string;
};

type ItemRow = {
  inspection_id: number;
  point: string;
  verdict: "pass" | "attention" | "fail";
};

export default async function InspectPage({
  searchParams,
}: PageProps<"/bay/inspect">) {
  await requireRole("submitInspection");

  const params = await searchParams;
  const preselect = typeof params.vehicle === "string" ? params.vehicle : undefined;

  const workshop = await loadCase();

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

  const chosen = vehicles.find((v) => v.id === preselect) ?? vehicles[0];

  // The tables only exist once the role migration has been applied, so a
  // failure here degrades to "not set up yet" rather than breaking the page.
  let recent: InspectionRow[] = [];
  let items: ItemRow[] = [];
  let tablesReady = true;

  const supabase = await createSessionClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("inspections")
      .select("id, vehicle_id, odometer, note, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) tablesReady = false;
    else {
      recent = (data as InspectionRow[]) ?? [];
      if (recent.length > 0) {
        const { data: itemData } = await supabase
          .from("inspection_items")
          .select("inspection_id, point, verdict")
          .in(
            "inspection_id",
            recent.map((r) => r.id)
          );
        items = (itemData as ItemRow[]) ?? [];
      }
    }
  }

  const plateOf = (id: string) =>
    workshop.vehicles.find((v) => v.id === id)?.plate ?? id;

  const flaggedFor = (id: number) =>
    items.filter((i) => i.inspection_id === id && i.verdict !== "pass");

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
        <PageHeader eyebrow="Workshop floor" title="Vehicle Inspection">
          <WorkshopDate today={workshop.today} />
          <span>
            {ALL_POINTS.length}-point visual check · anything not passed is raised
            for the manager
          </span>
        </PageHeader>
      </div>

      {!tablesReady && (
        <p className="mb-5 flex items-start gap-2 rounded-2xl border border-soon bg-soon-bg px-4 py-3 text-[13px] text-soon">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>
            Inspections are not set up in the database yet. Run{" "}
            <code>supabase/migration-roles.sql</code> and this page will start
            saving. The form below still shows the full checklist.
          </span>
        </p>
      )}

      {vehicles.length === 0 ? (
        <Empty
          icon={ClipboardCheck}
          title="No vehicles on the register"
          body="Seed the workshop before running an inspection."
        />
      ) : (
        <Reveal className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Card data-reveal padded={false}>
            <CardHeader
              title="New inspection"
              hint="Search by plate, owner or model, then work down the list — everything defaults to pass"
            />
            <div className="px-5 py-5">
              <InspectionForm
                vehicles={vehicles}
                defaultVehicle={chosen?.id}
                defaultOdometer={chosen?.km}
              />
            </div>
          </Card>

          <div className="space-y-6">
            <Card data-reveal padded={false}>
              <CardHeader title="Recent inspections" hint="Newest first" />
              {recent.length === 0 ? (
                <div className="p-5">
                  <Empty
                    icon={ClipboardCheck}
                    title="Nothing recorded yet"
                    body="Inspections you save will appear here with anything you flagged."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((r) => {
                    const flagged = flaggedFor(r.id);
                    return (
                      <li key={r.id} className="px-5 py-3.5">
                        <div className="flex flex-wrap items-baseline gap-2 text-[13px]">
                          <span className="nums font-medium">
                            {plateOf(r.vehicle_id)}
                          </span>
                          <span className="nums text-xs text-faint">
                            {formatDate(r.created_at.slice(0, 10))}
                          </span>
                          {r.odometer != null && (
                            <span className="nums text-xs text-faint">
                              {fmtKm(r.odometer)}
                            </span>
                          )}
                          <span className="ml-auto">
                            {flagged.length === 0 ? (
                              <Tag>all passed</Tag>
                            ) : (
                              <Tag tone="accent">
                                {flagged.length} flagged
                              </Tag>
                            )}
                          </span>
                        </div>
                        {flagged.length > 0 && (
                          <p className="mt-1 text-xs text-muted">
                            {flagged.map((f) => f.point).join(" · ")}
                          </p>
                        )}
                        {r.note && (
                          <p className="mt-1 text-xs text-faint">{r.note}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>
                An inspection records what you saw, not what it costs — pricing
                and the decision to book work sit with the office. Marking a point
                as needing attention or failing is what raises it there.
              </span>
            </p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
