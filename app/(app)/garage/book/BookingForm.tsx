"use client";

import { useActionState } from "react";
import { CalendarPlus, Check, Loader2, TriangleAlert } from "lucide-react";
import { requestServiceAction, type BookingState } from "./actions";
import { Button } from "@/components/ui/Button";

export function BookingForm({
  vehicles,
  today,
}: {
  vehicles: { id: string; plate: string; model: string }[];
  today: string;
}) {
  const [state, action, pending] = useActionState<BookingState, FormData>(
    requestServiceAction,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="vehicle_id" className="block text-sm font-medium">
          Which vehicle
        </label>
        <select
          id="vehicle_id"
          name="vehicle_id"
          required
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
        <label htmlFor="preferred_date" className="block text-sm font-medium">
          Preferred date
        </label>
        {/*
          `min` is the workshop's today, not the browser's — every date in this
          app is measured from the dataset, and mixing the two would let a
          customer pick a day the server considers past.
        */}
        <input
          id="preferred_date"
          name="preferred_date"
          type="date"
          required
          min={today}
          defaultValue={today}
          className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 nums text-sm sm:w-56"
        />
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium">
          Anything the workshop should know
          <span className="ml-1 font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder="A noise when braking, the AC is weak…"
          className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted"
        />
      </div>

      {state && (
        <p
          role="status"
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
            state.ok ? "bg-fine-bg text-fine" : "bg-overdue-bg text-overdue"
          }`}
        >
          {state.ok ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          )}
          {state.message}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
        ) : (
          <CalendarPlus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        {pending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
