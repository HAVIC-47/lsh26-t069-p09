"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardCheck, Loader2, TriangleAlert, Wrench } from "lucide-react";
import { saveServiceJobAction, type ServiceJobState } from "./actions";
import { VehiclePicker, type PickerVehicle } from "@/components/VehiclePicker";
import { Button } from "@/components/ui/Button";
import { useActionState } from "react";

export type ServiceItemRow = {
  vehicleId: string;
  name: string;
  status: "overdue" | "due_soon" | "fine";
  label: string;
  cost: number;
};

const STATUS_STYLE = {
  overdue: "bg-overdue-bg text-overdue",
  due_soon: "bg-soon-bg text-soon",
  fine: "bg-fine-bg text-fine",
} as const;

export type FindingRow = {
  vehicleId: string;
  point: string;
  verdict: "attention" | "fail";
};

export function ServiceForm({
  vehicles,
  items,
  findings,
  defaultVehicle,
  showMoney,
  onVehicleChange,
}: {
  vehicles: PickerVehicle[];
  /** Every vehicle's items, filtered client-side so picking a car is instant. */
  items: ServiceItemRow[];
  /** Points the last inspection raised, per vehicle. */
  findings: FindingRow[];
  defaultVehicle?: string;
  showMoney: boolean;
  /** Lets the surrounding panel follow the picker. */
  onVehicleChange?: (id: string) => void;
}) {
  const [state, action, pending] = useActionState<ServiceJobState, FormData>(
    saveServiceJobAction,
    null
  );

  const [vehicleId, setVehicleId] = useState(defaultVehicle ?? vehicles[0]?.id ?? "");
  const [odometer, setOdometer] = useState(
    vehicles.find((v) => v.id === (defaultVehicle ?? vehicles[0]?.id))?.km ?? 0
  );
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [tickedPoints, setTickedPoints] = useState<Set<string>>(new Set());

  const mine = useMemo(
    () => items.filter((i) => i.vehicleId === vehicleId),
    [items, vehicleId]
  );

  const raised = useMemo(
    () => findings.filter((f) => f.vehicleId === vehicleId),
    [findings, vehicleId]
  );

  const due = mine.filter((i) => i.status !== "fine");
  const healthy = mine.filter((i) => i.status === "fine");

  function choose(v: PickerVehicle) {
    setVehicleId(v.id);
    onVehicleChange?.(v.id);
    setOdometer(v.km);
    setTicked(new Set()); // a different car means a different job sheet
    setTickedPoints(new Set());
  }

  function toggle(name: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const tickAllDue = () => setTicked(new Set(due.map((i) => i.name)));

  function togglePoint(point: string) {
    setTickedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(point)) next.delete(point);
      else next.add(point);
      return next;
    });
  }
  const total = mine
    .filter((i) => ticked.has(i.name))
    .reduce((n, i) => n + i.cost, 0);

  const Row = ({ i }: { i: ServiceItemRow }) => (
    <li>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-surface-2">
        <input
          type="checkbox"
          name="items"
          value={i.name}
          checked={ticked.has(i.name)}
          onChange={() => toggle(i.name)}
          className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
        />
        <span className="min-w-0 flex-1 text-[13px] font-medium">{i.name}</span>
        <span
          className={`nums rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${STATUS_STYLE[i.status]}`}
        >
          {i.label}
        </span>
        {showMoney && (
          <span className="nums w-20 shrink-0 text-right text-[13px]">
            Tk {i.cost.toLocaleString()}
          </span>
        )}
      </label>
    </li>
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="vehicle_id" value={vehicleId} />

      <div>
        <p className="mb-2 text-sm font-medium">Vehicle</p>
        <VehiclePicker
          vehicles={vehicles}
          name="__picker_unused"
          defaultId={defaultVehicle}
          onChange={choose}
        />
      </div>

      {raised.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-soon" strokeWidth={2} aria-hidden="true" />
            <p className="text-sm font-medium">Raised by the last inspection</p>
            <Button
              type="button"
              size="sm"
              onClick={() => setTickedPoints(new Set(raised.map((r) => r.point)))}
            >
              Tick all ({raised.length})
            </Button>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-soon">
            {raised.map((f) => (
              <li key={f.point}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 bg-soon-bg/40 px-4 py-2.5 transition-colors duration-200 hover:bg-soon-bg">
                  <input
                    type="checkbox"
                    name="inspection_points"
                    value={f.point}
                    checked={tickedPoints.has(f.point)}
                    onChange={() => togglePoint(f.point)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1 text-[13px] font-medium">
                    {f.point}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
                      f.verdict === "fail"
                        ? "bg-overdue-bg text-overdue"
                        : "bg-soon-bg text-soon"
                    }`}
                  >
                    {f.verdict === "fail" ? "Failed" : "Needs attention"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            These are not interval items, so they have no next due date — they go
            on the job sheet as a record of what was addressed.
          </p>
        </div>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">What was done</p>
          {due.length > 0 && (
            <Button type="button" size="sm" onClick={tickAllDue}>
              Tick everything due ({due.length})
            </Button>
          )}
          <span className="ml-auto text-xs text-muted">
            {ticked.size} selected
            {showMoney && ticked.size > 0 && (
              <span className="nums text-text"> · Tk {total.toLocaleString()}</span>
            )}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          {mine.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted">
              This vehicle has no service items yet.
            </p>
          ) : (
            <>
              {due.length > 0 && (
                <>
                  <p className="eyebrow border-b border-border bg-surface-2/60 px-4 py-2">
                    Due or overdue
                  </p>
                  <ul className="divide-y divide-border">
                    {due.map((i) => (
                      <Row key={i.name} i={i} />
                    ))}
                  </ul>
                </>
              )}
              {healthy.length > 0 && (
                <>
                  <p className="eyebrow border-y border-border bg-surface-2/60 px-4 py-2">
                    Not yet due — tick only if actually done
                  </p>
                  <ul className="divide-y divide-border">
                    {healthy.map((i) => (
                      <Row key={i.name} i={i} />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          Only ticked items reset. Anything the customer declined keeps its
          current status and stays on the call desk.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="odometer" className="block text-sm font-medium">
            Odometer at service
            <span className="ml-1 font-normal text-muted">(optional)</span>
          </label>
          <input
            id="odometer"
            name="odometer"
            type="number"
            min={0}
            step={1}
            value={odometer}
            onChange={(e) => setOdometer(Number(e.target.value))}
            className="nums mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="note" className="block text-sm font-medium">
            Notes <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="note"
            name="note"
            placeholder="Anything the office should know"
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm placeholder:text-faint"
          />
        </div>
      </div>

      {state && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px] ${
            state.ok ? "bg-fine-bg text-fine" : "bg-soon-bg text-soon"
          }`}
        >
          {state.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          )}
          <div className="space-y-2">
            <p>{state.message}</p>
            {state.needsConfirm && (
              <Button type="submit" name="confirmAnomaly" value="yes" size="sm" disabled={pending}>
                The reading is correct — save it
              </Button>
            )}
          </div>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={pending || (ticked.size === 0 && tickedPoints.size === 0)}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Wrench className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        {pending ? "Saving…" : "Save service"}
      </Button>
    </form>
  );
}
