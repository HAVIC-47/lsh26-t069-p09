"use client";

import { useActionState } from "react";
import { Loader2, UserPlus, TriangleAlert, Check, ShieldMinus } from "lucide-react";
import {
  inviteStaffAction,
  revokeUserAction,
  type UserActionState,
} from "./actions";
import { Button } from "@/components/ui/Button";

export function InviteStaffForm() {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    inviteStaffAction,
    null
  );

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className="block text-xs font-medium text-muted">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="new_email" className="block text-xs font-medium text-muted">
            Email
          </label>
          <input
            id="new_email"
            name="email"
            type="email"
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-xs font-medium text-muted">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="technician"
            className="mt-1 h-11 w-full cursor-pointer rounded-lg border border-border bg-surface px-3 text-sm"
          >
            <option value="technician">Service Technician</option>
            <option value="manager">Workshop Manager</option>
            <option value="admin">Workshop Admin</option>
          </select>
        </div>
        <div>
          <label htmlFor="new_password" className="block text-xs font-medium text-muted">
            Temporary password
          </label>
          <input
            id="new_password"
            name="password"
            type="text"
            minLength={8}
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 nums text-sm"
          />
        </div>
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
          <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        {pending ? "Creating…" : "Create staff account"}
      </Button>
      <p className="text-xs text-muted">
        Customer accounts are not created here — a vehicle owner claims their own
        through sign-up, which links them to their record on the register.
      </p>
    </form>
  );
}

export function RevokeButton({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    revokeUserAction,
    null
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" disabled={pending} aria-label={`Revoke access for ${name}`}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden="true" />
        ) : (
          <ShieldMinus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        )}
        Revoke
      </Button>
      {state && !state.ok && (
        <span className="text-xs text-overdue">{state.message}</span>
      )}
    </form>
  );
}
