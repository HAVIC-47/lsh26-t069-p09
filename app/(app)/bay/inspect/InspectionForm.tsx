"use client";

import { useActionState } from "react";
import { Check, ClipboardCheck, Loader2, TriangleAlert } from "lucide-react";
import { saveInspectionAction, type InspectionState } from "./actions";
import { INSPECTION_POINTS, VERDICT_LABEL, type Verdict } from "@/lib/inspection";
import { Button } from "@/components/ui/Button";

const VERDICTS: Verdict[] = ["pass", "attention", "fail"];

const TONE: Record<Verdict, string> = {
  pass: "peer-checked:bg-fine-bg peer-checked:text-fine peer-checked:border-fine",
  attention: "peer-checked:bg-soon-bg peer-checked:text-soon peer-checked:border-soon",
  fail: "peer-checked:bg-overdue-bg peer-checked:text-overdue peer-checked:border-overdue",
};

export function InspectionForm({
  vehicles,
  defaultVehicle,
  defaultOdometer,
}: {
  vehicles: { id: string; plate: string; model: string; km: number }[];
  defaultVehicle?: string;
  defaultOdometer?: number;
}) {
  const [state, action, pending] = useActionState<InspectionState, FormData>(
    saveInspectionAction,
    null
  );

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="vehicle_id" className="block text-sm font-medium">
            Vehicle
          </label>
          <select
            id="vehicle_id"
            name="vehicle_id"
            required
            defaultValue={defaultVehicle}
            className="mt-1 h-11 w-full cursor-pointer rounded-lg border border-border bg-surface px-3 text-sm"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.model}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="odometer" className="block text-sm font-medium">
            Odometer now
            <span className="ml-1 font-normal text-muted">(optional)</span>
          </label>
          <input
            id="odometer"
            name="odometer"
            type="number"
            min={0}
            step={1}
            defaultValue={defaultOdometer}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 nums text-sm"
          />
        </div>
      </div>

      {INSPECTION_POINTS.map((group) => (
        <fieldset key={group.group}>
          <legend className="mb-2 text-sm font-semibold">{group.group}</legend>
          <ul className="space-y-1.5">
            {group.points.map((point) => (
              <li
                key={point}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 flex-1 text-sm">{point}</span>
                <div className="flex gap-1.5">
                  {VERDICTS.map((v) => (
                    <label key={v} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`p:${point}`}
                        value={v}
                        defaultChecked={v === "pass"}
                        className="peer sr-only"
                      />
                      {/* 44px minimum touch target — this is used on a tablet. */}
                      <span
                        className={`flex h-11 cursor-pointer items-center rounded-lg border border-border px-3 text-xs font-medium text-muted transition-colors duration-200 ${TONE[v]}`}
                      >
                        {VERDICT_LABEL[v]}
                      </span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      <div>
        <label htmlFor="note" className="block text-sm font-medium">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      {state && (
        <p
          role="status"
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-fine-bg text-fine" : "bg-overdue-bg text-overdue"
          }`}
        >
          {state.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          )}
          {state.message}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
        ) : (
          <ClipboardCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        {pending ? "Saving…" : "Save inspection"}
      </Button>
    </form>
  );
}
