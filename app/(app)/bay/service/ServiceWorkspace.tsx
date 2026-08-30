"use client";

import { useState } from "react";
import { History, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { ServiceForm, type FindingRow, type ServiceItemRow } from "./ServiceForm";
import type { PickerVehicle } from "@/components/VehiclePicker";

export type VehicleMeta = {
  health: number;
  inspection: { attention: number; fail: number; date: string } | null;
  history: { item: string; date: string; cost: number }[];
};

/**
 * Owns which vehicle is selected, so the health gauge and service history beside
 * the form move with the picker instead of being frozen at whatever the URL
 * asked for. Everything is precomputed on the server and handed over as data —
 * the scoring itself stays out of the browser.
 */
export function ServiceWorkspace({
  vehicles,
  items,
  findings,
  meta,
  defaultVehicle,
  showMoney,
  healthRule,
}: {
  vehicles: PickerVehicle[];
  items: ServiceItemRow[];
  findings: FindingRow[];
  meta: Record<string, VehicleMeta>;
  defaultVehicle?: string;
  showMoney: boolean;
  healthRule: string;
}) {
  const [vehicleId, setVehicleId] = useState(
    defaultVehicle ?? vehicles[0]?.id ?? ""
  );

  const chosen = vehicles.find((v) => v.id === vehicleId);
  const info = meta[vehicleId];

  const money = (n: number) => `Tk ${Math.round(n).toLocaleString("en-US")}`;
  const date = (iso: string) =>
    new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card padded={false}>
        <CardHeader title="Job sheet" hint="Search for the car, tick the work, save" />
        <div className="px-5 py-5">
          <ServiceForm
            vehicles={vehicles}
            items={items}
            findings={findings}
            defaultVehicle={defaultVehicle}
            showMoney={showMoney}
            onVehicleChange={setVehicleId}
          />
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-4">
            <HealthGauge score={info?.health ?? 100} size={92} />
            <div className="min-w-0">
              <p className="eyebrow">Health before this job</p>
              <p className="nums mt-1 text-[15px] font-semibold">{chosen?.plate}</p>
              <p className="text-xs text-muted">
                {chosen?.model} · {chosen?.owner}
              </p>
              {info?.inspection && (
                <p className="mt-1.5 text-xs text-soon">
                  Inspection on {date(info.inspection.date)} flagged{" "}
                  {info.inspection.attention} needing attention and{" "}
                  {info.inspection.fail} failed — recording a service clears that
                  penalty.
                </p>
              )}
            </div>
          </div>
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
            {healthRule}
          </p>
        </Card>

        <Card padded={false}>
          <CardHeader title="Service history" hint="Newest first" />
          {!info || info.history.length === 0 ? (
            <p className="flex items-center gap-2 px-5 py-6 text-[13px] text-muted">
              <History className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Nothing recorded on this vehicle yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {info.history.map((h, i) => (
                <li
                  key={`${h.item}-${h.date}-${i}`}
                  className="flex flex-wrap items-baseline gap-2 px-5 py-2.5 text-[13px]"
                >
                  <span className="font-medium">{h.item}</span>
                  <span className="nums text-xs text-faint">{date(h.date)}</span>
                  {showMoney && <span className="nums ml-auto">{money(h.cost)}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>
            Saving writes one history row per ticked item, so each of those items
            is dated from today and nothing else moves. The customer sees the
            update in their garage immediately.
          </span>
        </p>
      </div>
    </div>
  );
}
