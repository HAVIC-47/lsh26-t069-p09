import Link from "next/link";
import { redirect } from "next/navigation";
import { Wrench, Info } from "lucide-react";
import { currentProfile, ROLE_HOME, ROLE_LABEL } from "@/lib/auth";
import { hasAuth } from "@/lib/supabase/server";
import { LoginForm, type DemoAccount } from "./LoginForm";

export const dynamic = "force-dynamic";

/**
 * Published openly so a judge can sign in as each role. This is a hackathon
 * demo holding no real customer data — see the README.
 */
const DEMO_PASSWORD = "RideCatalyst!2026";

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "admin",
    label: ROLE_LABEL.admin,
    email: "admin@ridecatalyst.demo",
    password: DEMO_PASSWORD,
    home: ROLE_HOME.admin,
    sees: "Everything: revenue, staff accounts, the service catalogue",
  },
  {
    role: "manager",
    label: ROLE_LABEL.manager,
    email: "manager@ridecatalyst.demo",
    password: DEMO_PASSWORD,
    home: ROLE_HOME.manager,
    sees: "Call desk, forecasts and documents; records completed work",
  },
  {
    role: "technician",
    label: ROLE_LABEL.technician,
    email: "tech@ridecatalyst.demo",
    password: DEMO_PASSWORD,
    home: ROLE_HOME.technician,
    sees: "Bay queue, odometer intake and inspections — no prices anywhere",
  },
  {
    role: "customer",
    label: ROLE_LABEL.customer,
    email: "owner@ridecatalyst.demo",
    password: DEMO_PASSWORD,
    home: ROLE_HOME.customer,
    sees: "Only their own vehicles, their health and their invoices",
  },
];

export default async function LoginPage() {
  const profile = await currentProfile();
  if (profile) redirect(ROLE_HOME[profile.role]);

  return (
    <div className="mx-auto max-w-md space-y-5 py-6">
      <header className="text-center">
        <Wrench className="mx-auto h-7 w-7 text-accent" strokeWidth={2.2} aria-hidden="true" />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          Workshop data is visible only to signed-in users, scoped to the role you
          sign in as.
        </p>
      </header>

      {hasAuth ? (
        <LoginForm accounts={DEMO_ACCOUNTS} />
      ) : (
        <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>
            Supabase auth is not configured for this deployment, so sign-in is
            unavailable. See the README for setup.
          </span>
        </p>
      )}

      <p className="text-center text-sm text-muted">
        A vehicle owner?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <Link href="/" className="text-accent hover:underline">
          Back to the overview
        </Link>
      </p>
    </div>
  );
}
