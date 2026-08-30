"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { recordServiceAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/Button";

export function RecordServiceForm({
  vehicleId,
  itemName,
  rule,
}: {
  vehicleId: string;
  itemName: string;
  rule: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    recordServiceAction,
    null
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="itemName" value={itemName} />
      <input type="hidden" name="rule" value={rule} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        )}
        {pending ? "Saving…" : "Mark done"}
      </Button>
      {state && !state.ok && (
        <span className="text-xs text-overdue">{state.message}</span>
      )}
    </form>
  );
}
