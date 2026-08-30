"use client";

import { useActionState } from "react";
import { Loader2, LogIn, TriangleAlert } from "lucide-react";
import { signInAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";

export function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signInAction,
    null
  );

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={defaultEmail}
          key={defaultEmail}
          className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-medium text-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 font-mono text-sm"
        />
      </div>

      {state?.message && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-overdue-bg px-3 py-2 text-xs text-overdue"
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          {state.message}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
