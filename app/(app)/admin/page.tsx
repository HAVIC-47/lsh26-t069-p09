import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Users,
  Car,
  ArrowRight,
  Settings,
  Info,
  UserMinus,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { loadCase } from "@/lib/data";
import { analyse } from "@/lib/engine";
import {
  churnRisk,
  retentionRate,
  revenueByMonth,
  weeklyBuckets,
  CHURN_DAYS,
} from "@/lib/scoring";
import { taka } from "@/lib/format";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { RevenueChart } from "@/components/ui/RevenueChart";
import { Reveal } from "@/components/motion/Reveal";
import { WorkshopDate } from "@/components/WorkshopDate";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const profile = await requireRole("viewExecutive");

  const workshop = await loadCase();
  const rows = analyse(workshop);
  const forecast = weeklyBuckets(rows, workshop.today, 8);
  const churn = churnRisk(rows);

  const history = workshop.vehicles.flatMap((v) =>
    v.service_history.map((h) => ({ date: h.date, cost_bdt: h.cost_bdt }))
  );
  const months = revenueByMonth(history, 6, workshop.today);
  const thisMonth = months.at(-1);
  const lastMonth = months.at(-2);

  const delta =
    thisMonth && lastMonth && lastMonth.total > 0
      ? Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100)
      : null;

  const projected = forecast.buckets.reduce((n, b) => n + b.revenue, 0);
  const retention = retentionRate(workshop.vehicles.length, churn.length);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Executive Dashboard</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <WorkshopDate today={workshop.today} />
          <span>{profile.full_name} · business health across the whole workshop</span>
        </div>
      </header>

      <Reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={`Revenue, ${thisMonth?.label ?? "this month"}`}
          value={thisMonth?.total ?? 0}
          format="taka"
          hint={
            delta === null
              ? lastMonth
                ? `${lastMonth.label}: ${taka(lastMonth.total)}`
                : "no prior month recorded"
              : `${delta >= 0 ? "+" : ""}${delta}% on ${lastMonth!.label}`
          }
          tone={delta !== null && delta < 0 ? "overdue" : "fine"}
          icon={Wallet}
        />
        <KpiCard
          label="Projected, next 8 weeks"
          value={projected}
          format="taka"
          hint="work already predicted due"
          tone="accent"
          icon={TrendingUp}
        />
        <KpiCard
          label="Customer retention"
          value={retention}
          format="percent"
          hint={`${churn.length} vehicle(s) lapsed over ${CHURN_DAYS} days`}
          tone={retention >= 80 ? "fine" : retention >= 60 ? "soon" : "overdue"}
          icon={Users}
        />
        <KpiCard
          label="Fleet under care"
          value={workshop.vehicles.length}
          hint={`${workshop.owners.length} owners`}
          icon={Car}
        />
      </Reveal>

      <Card padded={false}>
        <CardHeader
          title="Recorded revenue by month"
          hint="Money already taken, from the service history — not a projection"
        />
        <div className="px-4 py-4">
          <RevenueChart months={months} />
        </div>
        <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>
            Revenue is not split into parts and labour: the dataset records one
            cost per service item, with no breakdown behind it. Splitting it
            would mean inventing the numbers.
          </span>
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card padded={false}>
          <CardHeader
            title="Retention risk"
            hint={`Predicted service passed over ${CHURN_DAYS} days ago with nothing recorded since`}
          />
          {churn.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">
              No lapsed customers — every vehicle has been seen inside its window.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {churn.slice(0, 6).map((e) => (
                  <li key={e.vehicleId} className="flex items-baseline gap-2 px-4 py-2.5 text-sm">
                    <UserMinus
                      className="h-3.5 w-3.5 shrink-0 text-overdue"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <Link
                      href={`/vehicles/${e.vehicleId}`}
                      className="font-medium transition-colors duration-200 hover:text-accent"
                    >
                      {e.ownerName}
                    </Link>
                    <span className="nums text-xs text-muted">
                      {Math.abs(e.worstDays)}d
                    </span>
                    <span className="ml-auto nums">{taka(e.value)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border px-4 py-2.5 text-xs text-muted">
                {churn.length > 6 && <>Showing 6 of {churn.length}. </>}
                <Link href="/analytics" className="text-accent hover:underline">
                  Full analytics
                </Link>
              </div>
            </>
          )}
        </Card>

        <Card padded={false}>
          <CardHeader title="Configuration" hint="Admin-only controls" />
          <ul className="divide-y divide-border">
            <li>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-surface-2"
              >
                <Users className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">User Management</span>
                  <span className="block text-xs text-muted">
                    Staff and customer accounts, and what each role may do
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-surface-2"
              >
                <Settings className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">System Settings</span>
                  <span className="block text-xs text-muted">
                    Predictive variables and the service item catalogue
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
