import Link from "next/link";
import {
  Wrench,
  ArrowRight,
  CalendarClock,
  Gauge,
  FileCheck2,
  ListOrdered,
  MessageCircle,
  ChartColumnBig,
  ShieldCheck,
  Phone,
} from "lucide-react";
import { loadCase } from "@/lib/data";
import { analyse, buildCallList, dailyRun } from "@/lib/engine";
import { weeklyBuckets } from "@/lib/scoring";
import { taka } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/ui/Badge";
import { HeroMotion } from "@/components/landing/HeroMotion";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { CountUp } from "@/components/motion/CountUp";

export const dynamic = "force-dynamic";

const RULES = [
  {
    icon: CalendarClock,
    title: "Fixed expiry",
    items: "Insurance · Fitness · Tax token · Battery warranty",
    body: "A printed date on a document. It does not care how far the car is driven, and it carries a fine, not just a repair bill.",
  },
  {
    icon: Wrench,
    title: "Time interval",
    items: "Engine oil · Air filter · Coolant · AC service",
    body: "Counted in months from the last service, clamped to the end of a short month so a February job never slides into March.",
  },
  {
    icon: Gauge,
    title: "Distance interval",
    items: "Brake pads · Tyres · Spark plugs · Timing belt",
    body: "Counted in kilometres, then converted to a date using that one vehicle's measured daily running. No two cars get the same answer.",
  },
];

const FEATURES = [
  {
    icon: ListOrdered,
    title: "A ranked call list, not a dump",
    body: "Every vehicle gets a priority score: 100 per overdue item, 25 per due-soon, one per 500 taka of pending work, plus a bonus when nobody has called in a week. The formula is printed on the page.",
  },
  {
    icon: MessageCircle,
    title: "Reminders in English or বাংলা",
    body: "A message built from that vehicle's real due items and costs, with Bangla numerals, one click to copy or to open WhatsApp with the customer's number already filled in.",
  },
  {
    icon: ChartColumnBig,
    title: "Eight weeks of workload ahead",
    body: "Upcoming work bucketed by week with the parts each week needs, so the busy weeks are visible before they arrive. The overdue backlog is counted separately so it cannot inflate week one.",
  },
  {
    icon: FileCheck2,
    title: "Paperwork before it costs a fine",
    body: "Insurance, fitness, tax token and battery warranty get a wider 30-day warning window than a mechanical service, because the consequence is different.",
  },
  {
    icon: ShieldCheck,
    title: "Four roles, enforced twice",
    body: "Row-level security in Postgres and a permission check in every server action. A customer signing in sees only their own vehicles — verified, not assumed.",
  },
  {
    icon: Phone,
    title: "Reasoning on every date",
    body: "Not just \"due 1 Sept\" but \"due at 139,498 km, now 139,372 km, so 126 km left at 51.9 km/day\". Every figure traces to that vehicle's own history.",
  },
];

export default async function LandingPage() {
  const workshop = await loadCase();
  const rows = analyse(workshop);
  const calls = buildCallList(rows, workshop.today);
  const forecast = weeklyBuckets(rows, workshop.today, 8);

  const overdue = rows.filter((r) => r.status === "overdue");
  const soon = rows.filter((r) => r.status === "due_soon");
  const atRisk = [...overdue, ...soon].reduce((n, r) => n + r.cost, 0);
  const rates = workshop.vehicles.map((v) => dailyRun(v).rate);
  const preview = calls.slice(0, 3);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-heading">
            <Wrench className="h-5 w-5 text-primary" strokeWidth={2.2} aria-hidden="true" />
            Service<span className="-ml-2 text-primary">Due</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="flex h-10 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-text"
            >
              Sign in
            </Link>
            <Link
              href="/desk"
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium whitespace-nowrap text-white transition-colors duration-200 hover:opacity-90"
            >
              Open the Call Desk
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--primary-soft),transparent_70%)]"
        />
        <HeroMotion>
          <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
            <p
              data-hero
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted"
            >
              LofiStack Hackathon 2026 · Problem P09 · Team T069
            </p>

            <h1
              data-hero
              className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl"
            >
              Know what is due{" "}
              <span className="text-primary">before the customer does</span>.
            </h1>

            <p
              data-hero
              className="mx-auto mt-4 max-w-2xl text-base text-muted text-pretty sm:text-lg"
            >
              A Dhaka workshop keeps its service register in a book and in the
              manager&rsquo;s head, so it finds out something was due only when the
              customer turns up with a problem. ServiceDue dates every part on
              every vehicle by its own rule, and says who to call today.
            </p>

            <div data-hero className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/desk"
                className="flex h-12 cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 font-medium text-white transition-colors duration-200 hover:opacity-90"
              >
                Open the Call Desk
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="flex h-12 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-5 font-medium transition-colors duration-200 hover:border-primary hover:text-primary"
              >
                Sign in as a role
              </Link>
            </div>

            <p data-hero className="mt-3 text-xs text-muted">
              No account needed to look around — the workshop is readable signed out.
            </p>

            {/* Live figures from the seeded workshop, not marketing numbers. */}
            <dl
              data-hero
              className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {[
                { label: "Vehicles tracked", value: workshop.vehicles.length, format: "number" as const, tone: "text-text" },
                { label: "Items overdue", value: overdue.length, format: "number" as const, tone: "text-overdue" },
                { label: "Due within 30 days", value: soon.length, format: "number" as const, tone: "text-soon" },
                { label: "Revenue at risk", value: atRisk, format: "taka" as const, tone: "text-accent" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-surface px-3 py-3 shadow-[var(--shadow-sm)]"
                >
                  <dd className={`font-mono text-2xl font-semibold tabular-nums ${s.tone}`}>
                    <CountUp value={s.value} format={s.format} />
                  </dd>
                  <dt className="mt-0.5 text-xs text-muted">{s.label}</dt>
                </div>
              ))}
            </dl>
            <p data-hero className="mt-2 text-xs text-muted">
              Live from the seeded workshop, measured against{" "}
              {formatDate(workshop.today)}.
            </p>
          </div>
        </HeroMotion>
      </section>

      {/* --------------------------------------------------- three rules */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <ScrollReveal>
            <div data-reveal className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight">
                Every part wears out on its own clock
              </h2>
              <p className="mt-2 text-muted">
                One interval applied to everything is how workshops get this wrong.
                Three rules, three different calculations.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {RULES.map(({ icon: Icon, title, items, body }) => (
                <div
                  key={title}
                  data-reveal
                  className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]"
                >
                  <Icon className="h-5 w-5 text-primary" strokeWidth={2} aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 font-mono text-xs text-muted">{items}</p>
                  <p className="mt-2.5 text-sm text-muted">{body}</p>
                </div>
              ))}
            </div>

            <p data-reveal className="mt-5 text-sm text-muted">
              Across this workshop, measured daily running spans{" "}
              <span className="font-mono text-text">
                {Math.min(...rates).toFixed(0)}–{Math.max(...rates).toFixed(0)} km/day
              </span>
              , so two vehicles with identical brake pads get different due dates.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------------------------------------- live call desk */}
      <section className="border-b border-border bg-surface-2/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <ScrollReveal>
            <div data-reveal className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight">
                Today&rsquo;s three most urgent calls
              </h2>
              <p className="mt-2 text-muted">
                Straight from the live engine — the same rows the workshop sees,
                each with the reasoning that produced the date.
              </p>
            </div>

            <ol className="mt-6 space-y-3">
              {preview.map((e, i) => (
                <li
                  key={e.vehicleId}
                  data-reveal
                  className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-sm)]"
                >
                  <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="font-medium">{e.ownerName}</span>
                    <span className="font-mono text-sm text-muted">{e.plate}</span>
                    <span className="ml-auto flex items-center gap-4 text-sm">
                      <span className="font-mono font-semibold tabular-nums">
                        {taka(e.totalCost)}
                      </span>
                      <span className="font-mono font-semibold text-accent tabular-nums">
                        {e.priority}
                      </span>
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {e.items.slice(0, 2).map((it) => (
                      <li key={it.itemName} className="px-4 py-2.5">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-medium">{it.itemName}</span>
                          <StatusBadge status={it.status} daysUntil={it.daysUntil} />
                        </div>
                        <p className="mt-1 text-xs text-muted">{it.basis}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>

            <p data-reveal className="mt-5 text-sm text-muted">
              Next eight weeks: {forecast.buckets.reduce((n, b) => n + b.vehicles, 0)}{" "}
              vehicle visits worth{" "}
              <span className="font-mono text-text">
                {taka(forecast.buckets.reduce((n, b) => n + b.revenue, 0))}
              </span>
              , peaking in week {forecast.buckets.reduce((a, b) => (b.revenue > a.revenue ? b : a)).index}.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ----------------------------------------------------- features */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <ScrollReveal>
            <h2 data-reveal className="text-2xl font-semibold tracking-tight">
              What the workshop gets
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  data-reveal
                  className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]"
                >
                  <Icon className="h-5 w-5 text-primary" strokeWidth={2} aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted">{body}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- cta */}
      <section>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <ScrollReveal>
            <h2 data-reveal className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Open it and look around
            </h2>
            <p data-reveal className="mx-auto mt-3 max-w-xl text-muted">
              {workshop.vehicles.length} vehicles across {workshop.owners.length}{" "}
              owners, every item dated and explained. Nothing to install and no
              account required.
            </p>
            <div data-reveal className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/desk"
                className="flex h-12 cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 font-medium text-white transition-colors duration-200 hover:opacity-90"
              >
                Open the Call Desk
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link
                href="/analytics"
                className="flex h-12 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-5 font-medium transition-colors duration-200 hover:border-primary hover:text-primary"
              >
                See the 8-week forecast
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-6 text-xs text-muted">
          <span>Team T069 · Problem P09 · LofiStack Hackathon 2026</span>
          <span className="ml-auto">
            Built on the supplied public dataset — see the README for what is mocked.
          </span>
        </div>
      </footer>
    </div>
  );
}
