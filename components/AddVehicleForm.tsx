"use client";

import { useActionState, useState } from "react";
import { Check, CarFront, Loader2, TriangleAlert, ChevronDown } from "lucide-react";
import { addVehicleAction, type AddVehicleState } from "@/app/(app)/vehicles/actions";
import { DOCUMENTS, KNOWN_MODELS } from "@/lib/catalogue";
import { Button } from "@/components/ui/Button";

const field =
  "mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm";

export function AddVehicleForm({
  owners,
  today,
}: {
  /** Empty for a customer — their own record is taken from their profile. */
  owners?: { id: string; name: string }[];
  today: string;
}) {
  const [state, action, pending] = useActionState<AddVehicleState, FormData>(
    addVehicleAction,
    null
  );
  const [showDocs, setShowDocs] = useState(false);
  const staff = Boolean(owners && owners.length > 0);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {staff && (
          <div className="sm:col-span-2">
            <label htmlFor="owner_id" className="block text-xs font-medium text-muted">
              Customer
            </label>
            <select id="owner_id" name="owner_id" required className={`${field} cursor-pointer`}>
              {owners!.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.id})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="plate" className="block text-xs font-medium text-muted">
            Registration plate
          </label>
          <input
            id="plate"
            name="plate"
            required
            placeholder="Dhaka Metro Ga 12-3456"
            className={`${field} nums placeholder:text-faint`}
          />
        </div>

        <div>
          <label htmlFor="model" className="block text-xs font-medium text-muted">
            Make and model
          </label>
          <input
            id="model"
            name="model"
            required
            list="known-models"
            placeholder="Toyota Axio"
            className={`${field} placeholder:text-faint`}
          />
          <datalist id="known-models">
            {KNOWN_MODELS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="odometer" className="block text-xs font-medium text-muted">
            Current odometer reading
          </label>
          <div className="flex items-center gap-2">
            <input
              id="odometer"
              name="odometer"
              type="number"
              min={0}
              step={1}
              required
              placeholder="60000"
              className={`${field} nums max-w-48 placeholder:text-faint`}
            />
            <span className="mt-1 text-xs text-muted">km</span>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Recorded as today&rsquo;s reading. Until a second reading exists, distance
            predictions use the workshop&rsquo;s assumed daily running.
          </p>
        </div>
      </div>

      {/* Documents are optional: an expiry date cannot be guessed, so a blank
          field means the paper simply is not tracked yet. */}
      <div className="rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setShowDocs((v) => !v)}
          aria-expanded={showDocs}
          className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-[13px] font-medium transition-colors duration-200 hover:bg-surface-2"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${showDocs ? "rotate-180" : ""}`}
            strokeWidth={2}
            aria-hidden="true"
          />
          Paperwork expiry dates
          <span className="ml-auto text-xs font-normal text-faint">optional</span>
        </button>
        {showDocs && (
          <div className="grid gap-4 border-t border-border px-4 py-4 sm:grid-cols-3">
            {DOCUMENTS.map((d) => (
              <div key={d.key}>
                <label
                  htmlFor={`doc_${d.key}`}
                  className="block text-xs font-medium text-muted"
                >
                  {d.name}
                </label>
                <input
                  id={`doc_${d.key}`}
                  name={`doc_${d.key}`}
                  type="date"
                  min={today}
                  className={`${field} nums`}
                />
              </div>
            ))}
            <p className="text-xs text-muted sm:col-span-3">
              Leave blank to skip. A document is only tracked once its real expiry
              date is known — an invented date is worse than no date.
            </p>
          </div>
        )}
      </div>

      {state && (
        <p
          role="status"
          className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px] ${
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
          <CarFront className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        {pending ? "Adding…" : staff ? "Add vehicle to the register" : "Add my vehicle"}
      </Button>
    </form>
  );
}
