"use client";

import { useActionState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { updateSettingsAction, type SettingsState } from "./actions";
import { SETTING_META, type Settings } from "@/lib/settings-schema";
import { Button } from "@/components/ui/Button";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateSettingsAction,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {SETTING_META.map((m) => (
          <div key={m.key}>
            <label htmlFor={m.key} className="block text-sm font-medium">
              {m.label}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id={m.key}
                name={m.key}
                type="number"
                min={m.min}
                max={m.max}
                step={1}
                defaultValue={settings[m.key]}
                className="h-11 w-28 rounded-lg border border-border bg-surface px-3 nums text-sm"
              />
              <span className="text-xs text-muted">{m.unit}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{m.help}</p>
          </div>
        ))}
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
        {pending && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
