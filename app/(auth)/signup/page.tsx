import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus, Info } from "lucide-react";
import { currentProfile, ROLE_HOME } from "@/lib/auth";
import { hasAuth } from "@/lib/supabase/server";
import { admin, hasSupabase } from "@/lib/supabase/admin";
import { SignUpForm } from "./SignUpForm";

export const dynamic = "force-dynamic";

/**
 * Finds an owner who has no account yet, so the hint below is always a number
 * that will actually work rather than a hard-coded one that may be taken.
 */
async function unclaimedOwner() {
  if (!hasSupabase || !admin) return null;
  const [{ data: owners }, { data: profiles }] = await Promise.all([
    admin.from("owners").select("name, phone, id").limit(60),
    admin.from("profiles").select("owner_id"),
  ]);
  const taken = new Set((profiles ?? []).map((p) => p.owner_id).filter(Boolean));
  return (owners ?? []).find((o) => !taken.has(o.id)) ?? null;
}

export default async function SignUpPage() {
  const existing = await currentProfile();
  if (existing) redirect(ROLE_HOME[existing.role]);
  const hint = await unclaimedOwner();

  return (
    <div className="mx-auto max-w-md space-y-5 py-6">
      <header className="text-center">
        <UserPlus className="mx-auto h-7 w-7 text-accent" strokeWidth={2.2} aria-hidden="true" />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Create a customer account
        </h1>
        <p className="mt-1 text-sm text-muted">
          For vehicle owners, to follow their own car&rsquo;s service status.
        </p>
      </header>

      {!hasAuth ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Supabase is not configured for this deployment, so sign-up is unavailable.
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <SignUpForm />
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted">
            <p className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>
                Your phone number must already be on a vehicle&rsquo;s record at the
                workshop. Sign-up only ever creates a{" "}
                <span className="text-text">customer</span> account — staff
                accounts are created by the workshop admin.
              </span>
            </p>
            {hint && (
              <p className="pl-5.5">
                To try it, use{" "}
                <span className="nums text-text">{hint.phone}</span> (
                {hint.name}), which has no account yet.
              </p>
            )}
            <p className="pl-5.5">
              Demo-grade verification: a real deployment would send a one-time
              code to the number rather than trusting whoever types it.
            </p>
          </div>
        </>
      )}

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
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
