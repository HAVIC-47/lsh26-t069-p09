"use client";

import { useActionState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { addReadingAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/Button";

export function OdometerForm({
  vehicleId,
  currentKm,
}: {
  vehicleId: string;
  currentKm: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addReadingAction,
    null
  );

  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <label className="sr-only" htmlFor="km">
          New odometer reading in kilometres
        </label>
        {/*
          No `min` attribute: a reading below the last one should be explained
          by the anomaly check, not silently blocked by the browser.
        */}
        <input
          id="km"
          name="km"
          type="number"
          step={1}
          defaultValue={currentKm}
          className="h-11 w-40 rounded-lg border border-border bg-surface px-3 nums text-sm"
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending && (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
          )}
          {pending ? "Saving…" : "Update"}
        </Button>
      </div>

      {state && !state.ok && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-soon-bg px-3 py-2 text-xs text-soon"
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <div className="space-y-2">
            <p>{state.message}</p>
            {state.needsConfirm && (
              <Button
                type="submit"
                name="confirmAnomaly"
                value="yes"
                size="sm"
                disabled={pending}
              >
                The reading is correct — save it
              </Button>
            )}
          </div>
        </div>
      )}

      {state?.ok && (
        <p role="status" className="text-xs text-fine">
          {state.message}
        </p>
      )}
    </form>
  );
}
