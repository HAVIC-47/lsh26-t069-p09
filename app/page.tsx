import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Gauge,
  LayoutDashboard,
  Warehouse,
  Car,
  ShieldCheck,
  Wrench,
  BookOpen,
  PhoneOff,
  Receipt,
} from "lucide-react";
import { currentProfile, ROLE_HOME } from "@/lib/auth";
import { hasAuth } from "@/lib/supabase/server";
import { Wordmark } from "@/components/brand/Monogram";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { PartsOrbit } from "@/components/landing/PartsOrbit";
import { HeroMotion } from "@/components/landing/HeroMotion";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

export const dynamic = "force-dynamic";

const PROBLEMS = [
  {
    icon: BookOpen,
    title: "The register is a book",
    body: "Service intervals live on paper and in the manager's head. Nothing surfaces until someone remembers to look.",
  },
  {
    icon: PhoneOff,
    title: "Nobody calls first",
    body: "The workshop finds out something was due when the customer arrives with a problem, not before.",
  },
  {
    icon: Receipt,
    title: "The customer pays for the delay",
    body: "A missed oil change becomes engine work. An expired fitness certificate becomes a traffic fine.",
  },
];

const RULES = [
  {
    icon: CalendarClock,
    n: "01",
    title: "Fixed expiry",
    items: "Insurance · Fitness · Tax token · Battery warranty",
    body: "A printed date on a document. It does not care how far the car is driven, and it carries a fine, not just a repair bill.",
  },
  {
    icon: Wrench,
    n: "02",
    title: "Time interval",
    items: "Engine oil · Air filter · Coolant · AC service",
    body: "Counted in months from the last service, clamped to the end of a short month so a February job never slides into March.",
  },
  {
    icon: Gauge,
    n: "03",
    title: "Distance interval",
    items: "Brake pads · Tyres · Spark plugs · Timing belt",
    body: "Counted in kilometres, then turned into a date using that one vehicle's measured daily running. No two cars get the same answer.",
  },
];

const ROLES = [
  {
    icon: LayoutDashboard,
    role: "Workshop Admin",
    email: "admin@ridecatalyst.demo",
    body: "Revenue month on month, projected earnings, retention. Manages staff accounts and the service catalogue.",
  },
  {
    icon: Wrench,
    role: "Workshop Manager",
    email: "manager@ridecatalyst.demo",
    body: "The daily call desk, ranked by what is overdue and what it is worth. Logs calls, sends reminders, records work.",
  },
  {
    icon: Warehouse,
    role: "Service Technician",
    email: "tech@ridecatalyst.demo",
    body: "Today's bay queue on a tablet. Logs odometer readings at intake and runs inspections. No prices — not their job.",
  },
  {
    icon: Car,
    role: "Vehicle Owner",
    email: "owner@ridecatalyst.demo",
    body: "Their own garage and nothing else: a health score per car, what is due, past invoices, and a booking request.",
  },
];

export default async function LandingPage() {
  // A signed-in user has no reason to see the pitch; send them to their desk.
  const profile = await currentProfile();
  if (profile) redirect(ROLE_HOME[profile.role]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-2.5 lg:px-6">
          <Link href="/">
            <Wordmark size={26} />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/signup"
              className="hidden h-9 cursor-pointer items-center rounded-full px-3 text-[13px] font-medium whitespace-nowrap text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-text sm:flex"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium whitespace-nowrap text-on-primary transition-opacity duration-200 hover:opacity-88"
            >
              Sign in
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ------------------------------------------------------- hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_75%_0%,var(--accent-soft),transparent_65%)]"
          />
          <HeroMotion>
            <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:px-6 lg:py-24">
              <div>
                <p data-hero className="eyebrow">
                  LofiStack Hackathon 2026 · Problem P09 · Team T069
                </p>

                <h1
                  data-hero
                  className="mt-5 text-[40px] leading-[1.05] text-balance sm:text-[54px]"
                >
                  Know what is due
                  <br />
                  <span className="text-accent italic">before</span> the customer does.
                </h1>

                <p
                  data-hero
                  className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted text-pretty sm:text-base"
                >
                  Ride Catalyst dates every part on every customer vehicle by its
                  own rule — a printed expiry, elapsed months, or distance
                  travelled — and turns that into a ranked list of who a Dhaka
                  workshop should call today.
                </p>

                <div data-hero className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-on-primary transition-opacity duration-200 hover:opacity-88"
                  >
                    Sign in to the workshop
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </Link>
                  <Link
                    href="/signup"
                    className="flex h-12 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-6 text-sm font-medium transition-colors duration-200 hover:border-border-strong hover:bg-surface-2"
                  >
                    I own a vehicle here
                  </Link>
                </div>

                <p data-hero className="mt-4 text-xs text-faint">
                  Workshop data is visible only after signing in. Demo accounts below.
                </p>
              </div>

              <div data-hero>
                <PartsOrbit />
              </div>
            </div>
          </HeroMotion>
        </section>

        {/* ---------------------------------------------------- problem */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-6">
            <ScrollReveal>
              <div data-reveal className="max-w-2xl">
                <p className="eyebrow">The problem</p>
                <h2 className="mt-3 text-[26px] sm:text-[32px]">
                  A few hundred vehicles, tracked from memory
                </h2>
                <p className="mt-3 text-muted">
                  Every vehicle has parts with their own life. Papers expire on a
                  fixed date, oil ages by the month, brake pads wear by the
                  kilometre. None of that fits in a register book.
                </p>
              </div>
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {PROBLEMS.map(({ icon: Icon, title, body }) => (
                  <div key={title} data-reveal className="border-t border-border pt-5">
                    <Icon className="h-5 w-5 text-overdue" strokeWidth={1.8} aria-hidden="true" />
                    <h3 className="mt-3 text-[17px]">{title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">{body}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ------------------------------------------------ three rules */}
        <section className="border-b border-border bg-surface-2/40">
          <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-6">
            <ScrollReveal>
              <div data-reveal className="max-w-2xl">
                <p className="eyebrow">How it dates things</p>
                <h2 className="mt-3 text-[26px] sm:text-[32px]">
                  Every part wears out on its own clock
                </h2>
                <p className="mt-3 text-muted">
                  One interval applied to everything is how workshops get this
                  wrong. Three rules, three different calculations — and for
                  distance items, the answer depends on how far that specific car
                  actually runs per day.
                </p>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {RULES.map(({ icon: Icon, n, title, items, body }) => (
                  <div
                    key={title}
                    data-reveal
                    className="rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-border-strong"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} aria-hidden="true" />
                      <span className="nums font-display text-2xl text-faint">{n}</span>
                    </div>
                    <h3 className="mt-4 text-[19px]">{title}</h3>
                    <p className="mt-1.5 text-[11px] text-faint">{items}</p>
                    <p className="mt-3 text-[13px] leading-relaxed text-muted">{body}</p>
                  </div>
                ))}
              </div>

              <p
                data-reveal
                className="mt-6 rounded-2xl border border-border bg-surface px-5 py-4 text-[13px] text-muted"
              >
                <span className="font-medium text-heading">
                  Every date comes with its reasoning.
                </span>{" "}
                Not just &ldquo;due 1 September&rdquo; but{" "}
                <span className="nums text-text">
                  &ldquo;due at 139,498 km, now 139,372 km, so 126 km left at 51.9
                  km/day&rdquo;
                </span>{" "}
                — so the person making the call can defend the number.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ------------------------------------------------- four roles */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-6">
            <ScrollReveal>
              <div data-reveal className="max-w-2xl">
                <p className="eyebrow">Access</p>
                <h2 className="mt-3 flex items-center gap-2.5 text-[26px] sm:text-[32px]">
                  <ShieldCheck className="h-6 w-6 text-accent" strokeWidth={1.8} aria-hidden="true" />
                  Four roles, four different products
                </h2>
                <p className="mt-3 text-muted">
                  Not one dashboard with buttons greyed out. Each role signs in to
                  its own home screen with its own navigation, and sees only the
                  data its job needs.
                </p>
              </div>

              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {ROLES.map(({ icon: Icon, role, email, body }) => (
                  <div
                    key={role}
                    data-reveal
                    className="rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-border-strong"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} aria-hidden="true" />
                      <h3 className="text-[18px]">{role}</h3>
                    </div>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{body}</p>
                    {hasAuth && (
                      <Link
                        href="/login"
                        className="nums mt-4 inline-flex cursor-pointer items-center gap-1.5 text-xs text-accent transition-opacity duration-200 hover:opacity-75"
                      >
                        {email}
                        <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* -------------------------------------------------------- cta */}
        <section>
          <div className="mx-auto max-w-2xl px-4 py-20 text-center lg:px-6">
            <ScrollReveal>
              <h2 data-reveal className="text-[28px] sm:text-[36px]">
                Sign in and look around
              </h2>
              {hasAuth ? (
                <>
                  <p data-reveal className="mx-auto mt-4 max-w-lg text-muted">
                    Four demo accounts, one per role. Tap any of them on the sign-in
                    page and both fields fill themselves.
                  </p>
                  <p data-reveal className="mx-auto mt-2 max-w-lg text-xs text-faint">
                    Credentials are published deliberately: this is a hackathon demo
                    holding no real customer data. Every role sees a genuinely
                    different scope — the Vehicle Owner account cannot reach another
                    owner&rsquo;s car.
                  </p>
                </>
              ) : (
                <p data-reveal className="mx-auto mt-4 max-w-lg text-muted">
                  Supabase is not configured for this deployment, so sign-in is
                  unavailable here. See the README for setup.
                </p>
              )}
              <div data-reveal className="mt-8">
                <Link
                  href="/login"
                  className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-on-primary transition-opacity duration-200 hover:opacity-88"
                >
                  Sign in
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
