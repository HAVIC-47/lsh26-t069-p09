import Link from "next/link";
import { UserRound, Phone, Car, ShieldCheck, Info } from "lucide-react";
import { requireRole, ROLE_LABEL } from "@/lib/auth";
import { loadCase } from "@/lib/data";
import { analyse, dailyRun } from "@/lib/engine";
import { healthScore } from "@/lib/scoring";
import { km as fmtKm } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Reveal } from "@/components/motion/Reveal";
import { AddVehicleForm } from "@/components/AddVehicleForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireRole("viewOwnGarage");
  const workshop = await loadCase();
  const rows = analyse(workshop);

  const owner = workshop.owners.find((o) => o.id === profile.owner_id);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1.5 text-sm text-muted">
          Your account and the vehicles linked to it
        </p>
      </header>

      <Reveal className="space-y-5">
        <Card data-reveal padded={false}>
          <CardHeader title="Account" />
          <dl className="divide-y divide-border">
            <div className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
              <dt className="w-32 shrink-0 text-muted">Name</dt>
              <dd className="flex items-center gap-2 font-medium">
                <UserRound className="h-3.5 w-3.5 text-muted" strokeWidth={2} aria-hidden="true" />
                {profile.full_name}
              </dd>
            </div>
            <div className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
              <dt className="w-32 shrink-0 text-muted">Role</dt>
              <dd>{ROLE_LABEL[profile.role]}</dd>
            </div>
            {owner && (
              <div className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                <dt className="w-32 shrink-0 text-muted">Phone on file</dt>
                <dd>
                  <a
                    href={`tel:${owner.phone}`}
                    className="inline-flex items-center gap-1.5 nums text-accent hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    {owner.phone}
                  </a>
                </dd>
              </div>
            )}
            <div className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
              <dt className="w-32 shrink-0 text-muted">Customer ID</dt>
              <dd className="nums text-xs text-muted">{profile.owner_id}</dd>
            </div>
          </dl>
        </Card>

        <Card data-reveal padded={false}>
          <CardHeader
            title="Your vehicles"
            hint={`${workshop.vehicles.length} linked to this account`}
          />
          <ul className="divide-y divide-border">
            {workshop.vehicles.map((v) => {
              const items = rows.filter((r) => r.vehicleId === v.id);
              const { last } = dailyRun(v);
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Car className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href="/garage"
                      className="nums text-sm font-medium transition-colors duration-200 hover:text-accent"
                    >
                      {v.plate}
                    </Link>
                    <p className="text-xs text-muted">
                      {v.model} · {fmtKm(last.km)}
                    </p>
                  </div>
                  <span className="nums text-sm">
                    {healthScore(items, v.inspection)}
                    <span className="text-xs text-muted"> health</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card data-reveal padded={false}>
          <CardHeader
            title="Add a vehicle"
            hint="Register another car to this account — the workshop sees it straight away"
          />
          <div className="px-5 py-5">
            <AddVehicleForm today={workshop.today} />
          </div>
        </Card>

        <Card data-reveal padded={false}>
          <CardHeader title="What this account can see" />
          <p className="flex items-start gap-2 px-4 py-3 text-sm text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
            <span>
              Only the vehicles above, and only their service records. Other
              customers&rsquo; vehicles, the workshop&rsquo;s call list, revenue
              figures and staff accounts are not reachable from this account —
              enforced by row-level security in the database, not just by hiding
              menu items.
            </span>
          </p>
        </Card>
      </Reveal>

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          Contact details are held on the workshop&rsquo;s register and are not
          editable here. Ask the workshop to change a phone number so their
          records and this account stay in step.
        </span>
      </p>
    </div>
  );
}
