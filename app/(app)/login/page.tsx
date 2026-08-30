import Link from "next/link";
import { redirect } from "next/navigation";
import { Wrench, ShieldCheck, Info } from "lucide-react";
import { currentProfile, ROLE_LABEL, type Role } from "@/lib/auth";
import { hasAuth } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

/**
 * Listed openly so a judge can sign in as each role. This is a public demo of
 * a hackathon submission holding no real customer data — see README.
 */
const DEMO_ACCOUNTS: { role: Role; email: string; sees: string }[] = [
  { role: "admin", email: "admin@servicedue.demo", sees: "Everything, plus the service catalogue and staff" },
  { role: "manager", email: "manager@servicedue.demo", sees: "Call desk, analytics, documents; records work" },
  { role: "technician", email: "tech@servicedue.demo", sees: "Vehicles and history, read-only; takes odometer readings" },
  { role: "customer", email: "owner@servicedue.demo", sees: "Only their own vehicles" },
];

const DEMO_PASSWORD = "ServiceDue!2026";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const profile = await currentProfile();
  if (profile) redirect("/desk");

  const params = await searchParams;
  const as = typeof params.as === "string" ? params.as : "";
  const prefill = DEMO_ACCOUNTS.find((a) => a.role === as)?.email;

  return (
    <div className="mx-auto max-w-md space-y-5 py-6">
      <header className="text-center">
        <Wrench className="mx-auto h-7 w-7 text-primary" strokeWidth={2.2} aria-hidden="true" />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          The workshop is readable without an account. Sign in to record work and
          to see the role-scoped views.
        </p>
      </header>

      {!hasAuth ? (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>
            Supabase auth is not configured for this deployment, so sign-in is
            unavailable. The workshop below still works, read-only, from the
            bundled dataset.
          </span>
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
            <LoginForm defaultEmail={prefill} />
          </div>

          <section className="rounded-xl border border-border bg-surface">
            <h2 className="flex items-center gap-1.5 border-b border-border px-4 py-2.5 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden="true" />
              Demo accounts
            </h2>
            <ul className="divide-y divide-border">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.role} className="px-4 py-2.5">
                  <Link
                    href={`/login?as=${a.role}`}
                    className="flex flex-wrap items-baseline gap-2 text-sm transition-colors duration-200 hover:text-primary"
                  >
                    <span className="font-medium">{ROLE_LABEL[a.role]}</span>
                    <span className="font-mono text-xs text-muted">{a.email}</span>
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">{a.sees}</p>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
              Password for all four:{" "}
              <span className="font-mono text-text">{DEMO_PASSWORD}</span>. Tap a
              role to fill the email in.
            </p>
          </section>
        </>
      )}

      <p className="text-center text-sm">
        <Link href="/desk" className="text-primary hover:underline">
          Continue without signing in
        </Link>
      </p>
    </div>
  );
}
