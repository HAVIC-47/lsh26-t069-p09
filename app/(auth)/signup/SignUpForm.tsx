"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, TriangleAlert, UserPlus } from "lucide-react";
import { signUpAction, type SignUpState } from "./actions";
import { Button } from "@/components/ui/Button";

export function SignUpForm() {
  const [state, action, pending] = useActionState<SignUpState, FormData>(
    signUpAction,
    null
  );
  const [reveal, setReveal] = useState(false);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="phone" className="block text-xs font-medium text-muted">
          Phone number on your vehicle&rsquo;s record
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="01XXXXXXXXX"
          className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 nums text-sm placeholder:text-muted"
        />
      </div>

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
          className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-medium text-muted">
          Password
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            className="h-11 w-full rounded-lg border border-border bg-surface pr-11 pl-3 nums text-sm"
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            className="absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-text"
          >
            {reveal ? (
              <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
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
          <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        {pending ? "Creating account…" : "Create customer account"}
      </Button>
    </form>
  );
}
