"use client";

import { useActionState, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { signInAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";

export type DemoAccount = {
  role: string;
  label: string;
  email: string;
  password: string;
  home: string;
  sees: string;
};

export function LoginForm({ accounts }: { accounts: DemoAccount[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signInAction,
    null
  );

  // Controlled so tapping a demo account can fill both fields at once.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  function useAccount(a: DemoAccount) {
    setEmail(a.email);
    setPassword(a.password);
    setPicked(a.role);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>

          {state?.message && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-overdue-bg px-3 py-2 text-xs text-overdue"
            >
              <TriangleAlert
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                strokeWidth={2}
                aria-hidden="true"
              />
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
      </div>

      <section className="rounded-2xl border border-border bg-surface">
        <h2 className="flex items-center gap-1.5 border-b border-border px-4 py-2.5 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden="true" />
          Demo accounts
        </h2>
        <ul className="divide-y divide-border">
          {accounts.map((a) => {
            const active = picked === a.role;
            return (
              <li key={a.role}>
                <button
                  type="button"
                  onClick={() => useAccount(a)}
                  aria-pressed={active}
                  className={`w-full cursor-pointer px-4 py-2.5 text-left transition-colors duration-200 ${
                    active ? "bg-accent-soft" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="font-medium">{a.label}</span>
                    <span className="nums text-xs text-muted">{a.email}</span>
                    <span className="ml-auto nums text-xs text-muted">{a.home}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{a.sees}</span>
                  {active && (
                    <span className="mt-1 block text-xs font-medium text-accent">
                      Filled in — press Sign in
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
          Tap a role to fill both the email and the password. The password is the
          same for all four; use the eye to check it.
        </p>
      </section>
    </div>
  );
}
