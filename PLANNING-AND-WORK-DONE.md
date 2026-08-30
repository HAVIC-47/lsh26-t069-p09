# ServiceDue — Planning and Work Done

**Problem P09 · Team T069 · LofiStack Hackathon 2026**
Status doc, written 30 August 2026. Covers everything from problem selection to
the current state, and exactly what is left.

---

## 0. Read this first if you are resuming

**The build is green.** `npx tsc --noEmit`, `npm run verify`, `npm test` and
`npm run build` all pass.

**Two things are outstanding and will bite immediately:**

1. **`supabase/migration-roles.sql` has NOT been run.** Until it is, signed-out
   users can still read workshop data, and the inspection/booking/settings
   features degrade to "not set up yet" messages. See §7.
2. **`/bay/inspect` has no `page.tsx`.** Its server action
   (`actions.ts`) and its form (`InspectionForm.tsx`) are written, but the page
   that renders them was never created — I was interrupted mid-file. The
   technician navigation links to this route, so it currently 404s. See §8.1.

---

## 1. How we got here

### 1.1 Problem selection

Twelve problems were released; each team picks two. We ranked them by
marks-per-minute rather than by difficulty tier, and picked **P09 Vehicle
Service Due Predictor** because:

- Pure date arithmetic — no fuzzy matching, no optimiser, no external API.
- Judges mark against a **published dataset**, so correctness is verifiable
  before submission rather than a matter of taste.
- MVP requirement 3 (reasoning) and 4 (checking lists) fall out almost free once
  requirement 2 (the dating engine) exists — roughly 4 requirements for the cost
  of 2.

Deliberately rejected: **P06 Personal Ledger** (OCR via vision API, file
storage, an API key a judge's session depends on) and **P05 Route Optimiser**
(constraint solver plus live rule-violation checking). Both had a higher
difficulty tier but far higher variance, and the early-submission bonus is
all-or-nothing at 3-of-4 MVP requirements on **both** problems.

### 1.2 Scoring arithmetic that drove the choices

| Category | Marks | Note |
|---|---|---|
| Functionality | 25 | The 4 MVP requirements |
| Demo & Documentation | 20 | README, LICENSES.md, video, submission fields |
| Problem Difficulty | 15 | Automatic, scaled by MVP completion |
| Technical Execution | 15 | Judged |
| UI / UX | 15 | Judged |
| Early Submission | 10 | **Zero unless ≥3 of 4 MVP work on both problems** |

Demo & Documentation is the cheapest 20 marks on the board — roughly 25 minutes
of work — which is why README and LICENSES.md were written properly and kept
current rather than left to the end.

### 1.3 Dataset analysis (done before any code)

`data/P09_vehicle_service_public.json`, 1.8 MB, 25 cases. Probed rather than
assumed, and the probing changed the design:

- **Exactly three rule types**: `fixed_date` (1578), `period_months` (1560),
  `distance_km` (1050). My first guess of `interval_days` was wrong — it is
  **months**.
- **Every non-`fixed_date` item has exactly one history row.** 1560 + 1050 =
  2610 = the total. So `.find()` always hits; no null guard needed.
- **`fixed_date` items have zero history rows** and need none.
- **`period_months` history rows carry `km: null`** — never read `km` on that
  branch.
- **No zero or negative odometer rates.** Spans 20–173 days, rates 13.96–89.87
  km/day. The division is always safe on this data.
- **No duplicate item names per vehicle**, so matching history by name is safe.
- **`cost_bdt` is a string**, not a number. Needs `parseFloat`.
- **`today` is a case field, never the clock.** Stated explicitly in the
  dataset's own `format_note`. Using `new Date()` would shift every due date on
  judging day.

One case (`PUB-01`) has 42 vehicles and 27 owners, which already satisfies the
requirement of ≥40 vehicles and ≥25 owners. **We seed one case and keep the
other 24 as test fixtures** — that is why `npm run verify` can run the real
engine against 4,188 items without a database.

---

## 2. The four MVP requirements — status

| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | ≥40 vehicles, ≥25 owners, 3 rule types, odometer + history | **Done** | `scripts/seed.ts`, seeded to Supabase |
| 2 | Next due date per item by its own rule, with status | **Done** | `lib/engine.ts` |
| 3 | Daily call list with reasoning, explainable sort | **Done** | `app/(app)/desk/page.tsx` |
| 4 | Vehicle page; record service resets that item only | **Done** | `app/(app)/vehicles/[id]/page.tsx` |

All four verified by automated checks, not by eye — see §5.

---

## 3. What has been built, in order

### Status at a glance

Two different scorecards. The one that is marked is the MVP.

**Hackathon MVP — 4 of 4 complete.** See §2. That is the whole 25-mark
Functionality category and the full difficulty multiplier, both earned.

**Build phases:**

| Phase | Status | What is missing |
|---|---|---|
| 1 · Design system + GSAP shell | **Complete** | — |
| 2 · Engine extensions | **Complete** | — |
| 3 · Auth, roles, RLS | **Complete** | schema run, seeded, all four roles verified |
| 4 · Call desk | **Partial** | call dispositions (§8.4); priority ranking and bilingual reminders are done |
| 5 · Analytics + documents | **Complete** | — |
| 6 · Landing page | **Complete** | rebuilt during phase 7 |
| 7 · Access-control rework | **Written, not activated** | migration not run (§7); `/bay/inspect` page missing (§8.1) |

**On Phase 7 specifically.** Roughly nine tenths of the code is written — role
homes, per-role navigation, the auth boundary on `app/(app)/`, the
marketing-only landing page, `viewMoney` gating, and six new pages. But it is
**zero per cent in force**, because `migration-roles.sql` has not been run.
Until it is, signed-out visitors still read workshop data through the old
`anon` policies, `/admin/settings` cannot save, and booking and inspections
have no tables behind them. Two things finish the phase: run the migration, and
write `app/(app)/bay/inspect/page.tsx`.

**What is incomplete is the role-specific product layer requested after the MVP
was already finished.** It carries marks in UI/UX and Technical Execution, but
none in Functionality.

### Phase 1 — Design system and app shell
- Palette from the `ui-ux-pro-max` data-dense dashboard profile: `#1E40AF`
  primary, `#F59E0B` accent, full light **and** dark token sets.
- **Fira Sans** for UI, **Fira Code** for tabular figures (plates, odometer,
  money, dates) via `next/font`.
- **Lucide** SVG icons throughout — no emoji used as an icon anywhere.
- Primitives: `Card`, `KpiCard`, `Badge`/`StatusBadge`/`Tag`, `Button`,
  `Empty`, `SideNav`, `HealthGauge`, `ForecastChart`, `RevenueChart`.
- GSAP motion: `Reveal` (entry stagger), `CountUp` (KPI numbers),
  `ScrollReveal` (ScrollTrigger), `HeroMotion` (landing hero).
- Skeleton `loading.tsx`, `error.tsx`, `not-found.tsx`.

### Phase 2 — Engine extensions (`lib/scoring.ts`)
All pure functions, no React, no Supabase:
- `healthScore` — fine + half of due-soon, over total.
- `callPriority` — 100/overdue + 25/due-soon + 1 per 500 BDT + 30 if not called
  in 7 days.
- `weeklyBuckets` — 8-week forecast; **overdue backlog kept separate** so it
  cannot inflate week 1.
- `partsRequisition` — item-name counts per bucket.
- `churnRisk` — items more than 45 days lapsed.
- `odometerAnomaly` — rollback (refused) and implausible jump (confirmable).
- `revenueByMonth`, `retentionRate` — for the admin dashboard.
- `DEFAULT_KM_PER_DAY = 25` fallback for a vehicle with fewer than 2 readings.

### Phase 3 — Auth, roles, RLS
- Supabase project created, `supabase/schema.sql` applied, `npm run seed` run.
- 9 tables, `user_role` enum, 4 SECURITY DEFINER helper functions, ~25 RLS
  policies.
- **Client split**: `lib/supabase/server.ts` (session client, RLS applies) vs
  `lib/supabase/admin.ts` (service role, bypasses RLS, seed + guarded writes).
- `lib/auth.ts` — the `CAN` permission table, `requireRole`,
  `requirePermission`, `ROLE_HOME`.
- `proxy.ts` — Supabase session cookie refresh (renamed from `middleware.ts`,
  which Next 16 deprecates).
- Login and sign-up pages; four seeded demo accounts.

### Phase 4 — Call desk (partial)
- Priority ranking wired into `buildCallList`.
- Bilingual EN/বাংলা reminder generator with Bangla numerals
  (`lib/messages.ts`), copy-to-clipboard and `wa.me` deep link with correct
  `880` country-code handling.

### Phase 5 — Analytics and documents
- `/analytics` — 8-week SVG forecast chart, parts requisition, churn list.
- `/documents` — `fixed_date` items only, 30-day warning window.

### Phase 6 — Landing page
- GSAP hero stagger, ScrollTrigger reveals, count-ups.
- Rejected the skill's default recommendation (e-commerce reviews pattern,
  Rubik/Nunito, sky-blue) as wrong for an internal workshop tool.

### Phase 7 — Access-control rework (**in progress, this is where we stopped**)
Driven by your instruction that signed-out users must see nothing and each role
must get its own product:
- `ROLE_HOME` — admin → `/admin`, manager → `/desk`, technician → `/bay`,
  customer → `/garage`.
- `NAV_BY_ROLE` — four separate menus, not one menu with items greyed out.
- `app/(app)/layout.tsx` now calls `requireUser()`, so the whole route group is
  behind auth. Auth pages moved to `app/(auth)/` to avoid a redirect loop.
- Landing page rewritten with **no workshop data at all** — product explanation
  plus demo credentials.
- `viewMoney` permission added; technician views are stripped of every price.
- New pages: `/admin`, `/admin/users`, `/admin/settings`, `/bay`, `/garage`,
  `/garage/book`, `/garage/profile`.

---

## 4. Architecture decisions and why

**Reads go through the session client, never the service-role one.** This was a
real bug caught mid-build: `loadCase` was using the admin client, which bypasses
RLS, so the customer role would have seen all 42 vehicles despite correct
policies. Proven by comparing an anon REST read (`[]`) against a service-role
read (all 27 owners).

**The permission guard is application code, not just RLS.** Server actions use
the admin client by design, so `requirePermission()` — not the database policy —
is what actually stops an unauthorised write. RLS is the second line.

**`lib/engine.ts` and `lib/scoring.ts` stay pure.** No React, no Supabase. That
is what lets `npm run verify` exercise the real logic against all 25 dataset
cases with no database, and it is why the tests are meaningful rather than
decorative.

**Charts are hand-rolled inline SVG.** Recharts is ~100 KB for one chart and
fights the CSS custom properties. Inline SVG themes correctly in dark mode and
adds no licence entry. Every chart has a `<details>` table alternative.

**Reveals use `gsap.from()`, not CSS `opacity: 0`.** An earlier version hid
elements in the stylesheet, which would have left the page blank if JS failed.
Now the served HTML is visible and GSAP animates from an offset.

**Derive-only, no fabrication.** Per your instruction, VIN, engine number, make,
year, fuel type, vehicle category, owner email/address, and inventory levels
were **not** invented. Technician identity on a record comes from the signed-in
profile, which is real. Revenue is not split into parts vs labour because the
dataset stores one cost per item with no breakdown.

**Route groups.** `app/(app)/` carries the workshop shell and the auth boundary;
`app/(auth)/` has no guard (guarding it would loop); `app/page.tsx` is the
public landing page.

---

## 5. Verification actually performed

Not claims — these were run and passed.

```
npx tsc --noEmit     PASS
npm run verify       PASS — 4,188 items across all 25 cases
npm test             PASS — reset isolation across 165 items
npm run build        PASS — 15 routes + proxy
```

`npm run verify` asserts far more than "dates come out":
- health scores stay in 0–100, and an all-fine vehicle reads exactly 100
- an overdue vehicle always outranks a fine one
- the staleness bonus is worth **exactly** its stated 30 points
- the forecast loses no rows: bucketed + backlog + beyond-8-weeks = total
- parts counts reconcile with the items they came from
- churn entries are strictly a subset of the deeply overdue
- all three odometer-anomaly branches fire correctly
- the one-reading fallback returns 25 km/day and flags itself estimated

`npm test` services **all 165 items one at a time** and asserts no other item's
due date moves — the "reset that one item only" constraint, proven.

`scripts/test-roles.mjs` (needs Playwright, see file header) verified:
```
SIGNED OUT   42 vehicles, writes refused with a reason
MANAGER      42 vehicles
TECHNICIAN   42 vehicles
ADMIN        42 vehicles
CUSTOMER      3 vehicles · own V01 opens · V02 unreachable
```
**Note:** the "SIGNED OUT sees 42" line is from *before* the Phase 7 lockdown.
After `migration-roles.sql` runs, that assertion must be changed to expect a
redirect to `/login`. See §8.2.

Sign-up was verified end to end: an unknown phone is refused; a real unclaimed
number creates an account that is customer-scoped, not staff. Both test accounts
created during that run were deleted — the database holds exactly the four demo
profiles.

UI was verified by **screenshot, not by reading HTML**, at 375 px and 1440 px in
both colour schemes, with checks for horizontal overflow, console errors, and
that `prefers-reduced-motion` leaves nothing stuck invisible. Two real bugs were
caught this way: `-727 km left` (now "already 727 km past it") and a KPI reading
"Busiest week **7**" where 7 was a vehicle count (now "Peak week vehicles").

---

## 6. Current state of the codebase

```
app/
  page.tsx                     landing (public, no workshop data)
  (auth)/
    layout.tsx                 minimal chrome, no guard
    login/                     page, form, actions
    signup/                    page, form, actions — customer accounts only
  (app)/                       ← auth boundary: requireUser() in layout.tsx
    layout.tsx                 role-aware sidebar shell
    loading|error|not-found.tsx
    admin/                     executive dashboard
      users/                   accounts + permission matrix + invite/revoke
      settings/                predictive variables + catalogue
    desk/                      manager call desk
    vehicles/                  register + [id] detail
    analytics/                 forecast, parts, churn
    documents/                 paperwork expiry vault
    bay/                       technician queue
      inspect/                 ⚠ actions.ts + InspectionForm.tsx, NO page.tsx
    garage/                    customer My Garage
      book/                    service request
      profile/                 account + scope explanation
  actions.ts                   guarded record-service / odometer actions
lib/
  engine.ts     dating, statuses, call list            (pure)
  scoring.ts    health, priority, forecast, churn,
                anomaly, revenue, retention            (pure)
  dates.ts      UTC maths, month-end clamping          (pure)
  messages.ts   EN/BN reminder templates               (pure)
  inspection.ts the 20-point checklist definition      (pure)
  auth.ts       CAN table, guards, ROLE_HOME
  nav.ts        NAV_BY_ROLE
  settings.ts   tunable predictive variables
  data.ts       session-client reads, JSON fallback
  types.ts      domain types + Role
  supabase/     config.ts, server.ts, admin.ts
supabase/
  schema.sql          full schema (run ✓)
  policies-anon.sql   signed-out read access (run ✓ — now being reversed)
  revoke-anon.sql     superseded by migration-roles.sql
  migration-roles.sql ⚠ NOT RUN YET
scripts/
  seed.ts  verify.ts  test-reset.ts  test-roles.mjs
proxy.ts    Supabase session refresh
```

### Supabase state
Project `gamiabikqpwqdtykzpzb`. Seeded with PUB-01: 27 owners, 42 vehicles, 134
odometer readings, 165 service items, 99 history rows, 4 demo accounts.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ridecatalyst.demo` | `RideCatalyst!2026` |
| Manager | `manager@ridecatalyst.demo` | `RideCatalyst!2026` |
| Technician | `tech@ridecatalyst.demo` | `RideCatalyst!2026` |
| Customer | `owner@ridecatalyst.demo` | `RideCatalyst!2026` |

The customer account is linked to owner `O01` (Salma Ahmed), who has 3 vehicles.

### Security note carried forward
The **database password and the secret API key were both pasted into the chat
transcript.** Both should be rotated before this is shown publicly:
- Project Settings → Database → Reset database password
- Project Settings → API Keys → New secret key, then revoke `default`
  (and update `.env.local`)

---

## 7. Immediate next step — run the migration

`supabase/migration-roles.sql` is written but **not applied**. Until it is, the
Phase 7 access control is only half in force.

1. Supabase → **SQL Editor** → **+ New query**
2. Paste `supabase/migration-roles.sql`, **Run**

It does three things:
1. **Drops the seven `anon demo read` policies** — after this an unauthenticated
   request reads nothing at all.
2. **Adds tunable columns to `app_config`** (`soon_days`, `default_km_per_day`,
   `max_km_per_day`, `churn_days`, `document_days`) so `/admin/settings` can
   actually save.
3. **Creates `inspections`, `inspection_items` and `service_requests`** with
   their RLS policies, so the technician checklist and customer booking work.

It drops no table and deletes no workshop data. `supabase/revoke-anon.sql` is a
subset of this and can be ignored.

---

## 8. What is left to build

### 8.1 Finish `/bay/inspect` — **blocking, nav links to it**
`actions.ts` and `InspectionForm.tsx` exist. Missing: `page.tsx`. It needs to:
- `await requireRole("recordInspection")`
- load the workshop, read `?vehicle=` from `searchParams` to preselect
- render `<InspectionForm vehicles={...} defaultVehicle={...} defaultOdometer={...} />`
- list recent inspections for that vehicle from the `inspections` table, showing
  flagged points

The form contract is already fixed by `actions.ts`: field names are
`vehicle_id`, `odometer`, `note`, and one radio per point named `p:<point>` with
values `pass` / `attention` / `fail`.

### 8.2 Update `scripts/test-roles.mjs`
Its "SIGNED OUT sees 42 vehicles" assertion becomes wrong once the migration
runs. Change it to assert a redirect to `/login`, and add a check that a
technician sees **no prices** anywhere on `/vehicles`.

### 8.3 Feed flagged inspections to the manager
The spec says a "Fail" should flag the manager's dashboard. The data now exists
(`inspection_items.verdict`), but nothing on `/desk` reads it yet.

### 8.4 Call dispositions
`call_logs` table and policies exist, and `callPriority` already consumes a
`lastCalledAt`. Missing: the inline control on `/desk` to log *scheduled /
no answer / postponed / declined / reminder sent*, and passing the resulting
map into `buildCallList` (which already accepts it as a third argument).

### 8.5 Multi-item job sheets
`service_jobs` exists in the schema so one visit can group several items with a
technician and a note. Today a service is still recorded one item at a time.
`scripts/test-reset.ts` should then be extended to assert that checked items
reset and unchecked ones hold their status.

### 8.6 Manager view of service requests
Customers can now raise `service_requests`, but no manager screen lists them or
confirms/declines them. The `office updates requests` policy is already in place.

### 8.7 Smaller items
- **Editable catalogue.** `/admin/settings` shows it read-only. Prices and
  intervals are stored per vehicle, so a shared catalogue table with per-vehicle
  overrides would be needed.
- **Per-item due-soon windows.** One constant today; should be a per-item column
  (insurance deserves 60 days, a timing belt fewer).
- **Confidence on distance estimates.** Daily running is measured over 20–173
  days depending on the vehicle; a short history should show a range, not a
  single confident day.
- **Real sign-up verification** by one-time code rather than trusting a typed
  phone number.
- **PDF receipts** on the customer portal.

---

## 9. Known limitations (documented, not accidental)

- **404s return HTTP 200.** `app/(app)/loading.tsx` streams every route, so the
  status line is flushed before a page can call `notFound()`. The correct
  "Vehicle not found" page renders; only the status code is wrong. The skeletons
  were judged the better trade for a dashboard whose pages each run a full
  workshop query.
- **The bay queue is derived, not a real check-in.** No check-in table exists,
  so `/bay` lists vehicles with outstanding work rather than cars physically in
  the workshop. Labelled honestly in the UI.
- **Sign-up verification is demo-grade** — it trusts whoever types a phone
  number on the register.
- **Local dev without Supabase runs as a synthetic admin** (`LOCAL_DEV_PROFILE`
  in `lib/auth.ts`) so `npm install && npm run dev` works from a clean checkout
  instead of showing an unescapable login page. Any deployment with credentials
  enforces real sign-in.
- **Revenue is not split parts vs labour** — the dataset has one cost per item.

---

## 10. Submission checklist

- [x] Source code repository
- [x] `EVENT.md` with team ID T069, problem P09, code LSH26-8490-C900
- [x] `README.md` — what it does, how to run, what is mocked, what is next
- [x] `LICENSES.md` — all dependencies, fonts, template, dataset, services
- [ ] **Live URL** — not yet deployed to Vercel. Needs the three env vars from
      `.env.local` added in the Vercel dashboard.
- [ ] **Demo video**, 60 seconds maximum
- [ ] Paste the live URL into `README.md` (line 10 is a placeholder)
- [ ] Rotate the leaked database password and secret key (§6)
- [ ] Commit — the repo currently has **no commits at all**; `EVENT.md` must be
      in the first one

Suggested first commit:
```bash
git add -A && git commit -m "Add EVENT.md and ServiceDue workshop management system"
```

---

# Appendices

The sections above cover what was done. These cover the reference material
needed to continue without re-deriving it.

---

## Appendix A — The target role specification

This is the specification the Phase 7 rework is building toward, as given. §8
lists what is still missing against it; this is the definition of "done".

### A.1 Workshop Admin / Owner
Unrestricted access. Interface tailored to business strategy, financial health
and system configuration rather than daily customer calls.

**Landing page — Executive Dashboard**
- KPI banner: Total Revenue (current month vs last), Projected 8-Week Revenue,
  Customer Retention Rate, Technician Efficiency
- Financial visualisations: revenue trends over time, segmented by service type
  (Parts vs Labor)
- Navigation: Dashboard | Operations | Financials | User Management | System Settings

**Exclusive modules**
- User Management grid — invite managers/technicians, revoke access, reset passwords
- System Configuration panel — adjust global predictive variables (e.g. default
  daily distance 25 to 30 km) and manage the Service Item Catalog (add parts, set
  default BDT prices)

**Built:** dashboard, KPIs (minus Technician Efficiency), revenue chart, user
management with invite/revoke, permission matrix, predictive-variable form.
**Not built:** password reset, Parts vs Labor segmentation (no data — see §9),
Technician Efficiency (no technician on historical records), editable catalogue.

### A.2 Workshop Manager
The revenue driver. Highly operational, dense with actionable data, optimised
for desktop.

**Landing page — Daily Call Priority Desk**
- Active data table, auto-sorted by Priority Ranking Score (overdue items with
  the highest estimated bill value at top)
- Inline actions per customer: "Log Call", "Send WhatsApp", "Mark as Booked"
- Navigation: Priority Desk | Fleet & Customers | 8-Week Forecast | Message Templates

**Modules**
- Customer & Vehicle CRM — split-pane; clicking a vehicle shows the full due
  breakdown and a "Record Service" action to reset specific intervals
- 8-Week Forecast Board — Kanban or bar chart of upcoming workshop load

**Built:** priority-ranked desk, WhatsApp/copy reminder generator, forecast bar
chart, vehicle detail with per-item record.
**Not built:** inline "Log Call" and "Mark as Booked" (§8.4), split-pane CRM
layout (currently list then detail page), Message Templates screen, Kanban view.

### A.3 Service Technician / Mechanic
Radically simplified, touch-friendly for tablets/phones in the workshop bay,
**completely stripped of financial data**.

**Landing page — Bay Queue**
- Large-touch-target list of vehicles checked into the workshop for the day
- Navigation: Today's Vehicles | Inspection Forms | History Lookup

**Modules**
- Intake Form (crucial) — prominent, large-font number input to log
  `current_odometer` as soon as they sit in the car; immediately updates the
  predictive engine
- Digital Inspection Checklist — grid of toggles (Pass / Needs Attention / Fail)
  for a standard 20-point check (wipers, AC, fluid levels, tyre tread). Marking
  "Fail" flags the Manager dashboard
- Service History read-only — chronological timeline per vehicle

**Built:** bay queue with 44px targets and no prices anywhere, prominent
odometer intake, 20-point checklist definition plus form plus save action.
**Not built:** the inspect page itself (§8.1), flagged items reaching the
manager (§8.3), true check-in (queue is derived — see §9).

### A.4 Vehicle Owner (Customer)
Clean, reassuring self-service portal optimised for mobile. Requires secure
authentication (e.g. OTP via phone number).

**Landing page — My Garage**
- Cards per owned vehicle
- Navigation: My Garage | Book Appointment | Profile

**Modules**
- Vehicle Health Dashboard — visual gauge (circle chart) with overall Health Score
- Status list — traffic light: red Overdue, amber Due Soon, green Healthy
- History and Invoices — past visits with "Download Receipt" (PDF)
- Actionable — "Request Service" opens a date picker, notifies the Manager

**Built:** My Garage with SVG health gauge, traffic-light grouped status list,
past visits, booking request with date picker, profile page.
**Not built:** PDF receipts (§8.7), OTP authentication (§8.7 — sign-up currently
trusts a typed phone number), manager-side view of requests (§8.6).

---

## Appendix B — Hackathon rules that affect decisions

**Format.** 4 hours, teams of 2–4, exactly 2 problems from 12. AI tools allowed;
pre-written code for the released problems is not.

**Per-problem submission.** Source repo, live URL that works without setup,
README (what it does, how to run, what is mocked, what is next), demo video of
60 seconds maximum, and `LICENSES.md`.

**Scoring, 100 marks.** Functionality 25, Early Submission 10, Problem
Difficulty 15, Technical Execution 15, UI/UX 15, Demo and Documentation 20.
Judged categories are scored per problem and averaged.

**Early submission.** 1.25 marks per complete 30-minute block remaining,
measured from the last commit across both repositories. Partial blocks do not
count. **Awarded only if at least 3 of 4 MVP requirements are verified working
on BOTH problems** — otherwise zero.

**Difficulty credit.** Easy 5.0, Medium 6.5, Hard 7.5, scaled by
(MVP requirements working / total). A Hard at 3/4 scores 5.6, barely above an
Easy at 4/4 scoring 5.0 — which is why a reliable Medium beat a risky Hard.

**Demo and Documentation breakdown.** Demo video 8, README 6, LICENSES.md 4,
submission completeness 2.

**Tiebreaks, in order.** Higher Functionality, higher Functionality on the
better problem, earlier last commit, higher Technical Execution, Event Lead.

**Internship observation — separate from the 100 marks.** Proctors score
individuals 1–5 on: Decomposition, Communication, Debugging Under Pressure,
Ownership, Tool Judgment, Composure. Worth talking through plans aloud in the
team room.

---

## Appendix C — Stack and exact versions

Node 22.23.2, npm 10.9.8, Windows 11.

| Package | Range | Installed | Licence |
|---|---|---|---|
| next | 16.3.3 | 16.3.3 | MIT |
| react / react-dom | 19.2.8 | 19.2.8 | MIT |
| @supabase/supabase-js | ^2.112.4 | 2.112.4 | MIT |
| @supabase/ssr | ^0.12.5 | 0.12.5 | MIT |
| gsap | ^3.15.0 | 3.15.0 | Standard "no charge" licence |
| lucide-react | ^1.37.0 | 1.37.0 | ISC |
| server-only | ^0.0.1 | 0.0.1 | MIT |
| tailwindcss / @tailwindcss/postcss | ^4 | 4.3.3 | MIT |
| typescript | ^5 | 5.9.3 | Apache-2.0 |
| tsx | ^4.23.13 | 4.23.13 | MIT |
| dotenv | ^17.4.2 | 17.4.2 | BSD-2-Clause |

Fonts: Fira Sans and Fira Code, SIL OFL 1.1, via `next/font`.

**Next 16 specifics that cost time:**
- `middleware.ts` is deprecated, so the file is `proxy.ts` exporting `proxy`.
- Typed routes: after moving any route file, run `rm -rf .next && npx next typegen`
  or `tsc` fails on stale generated validators.
- A route group adds no path segment, so `app/(app)/layout.tsx` types as
  `LayoutProps<"/">`, not `LayoutProps<"/desk">`.

---

## Appendix D — Design tokens

Light values are the source of truth; the dark block redefines only what
changes. Full set in `app/globals.css`.

| Token | Light | Role |
|---|---|---|
| `--bg` | `#f8fafc` | page ground |
| `--surface` | `#ffffff` | cards, tables |
| `--surface-2` | `#f1f5f9` | inset panels, hover |
| `--border` | `#e2e8f0` | hairlines |
| `--border-strong` | `#cbd5e1` | axis lines, dashed empties |
| `--text` | `#0f172a` | body |
| `--heading` | `#1e3a8a` | h1 to h3 |
| `--muted` | `#475569` | secondary text (4.5:1 minimum) |
| `--primary` | `#1e40af` | actions, active nav |
| `--primary-soft` | `#dbeafe` | active nav ground, rank chips |
| `--secondary` | `#3b82f6` | chart bars |
| `--accent` | `#f59e0b` | money, peak bars, priority score |
| `--overdue` / `-bg` | `#b4261c` / `#fdeceb` | red status |
| `--soon` / `-bg` | `#9a5b00` / `#fdf2e0` | amber status |
| `--fine` / `-bg` | `#1f6b3f` / `#eaf5ee` | green status |

**Animation budget:** one or two animated elements per view. Every animation is
wrapped in `gsap.matchMedia()` with a `prefers-reduced-motion: reduce` branch
that renders the final state and runs no scroll-driven motion. Reveals use
`gsap.from()` so content is visible without JS.

**Touch targets:** 44px minimum (`h-11`) on all primary controls — the
technician UI is used on a tablet.

---

## Appendix E — Baseline numbers (regression reference)

If any of these change without a deliberate cause, something broke.

**All 25 dataset cases**

```
items 4,188 · overdue 1,172 · due soon 841 · fine 2,175
undatable 0 · malformed 0
```

**PUB-01 (the seeded workshop), today = 2026-08-30**

```
42 vehicles · 27 owners · 165 items · 99 history rows · 134 odometer readings
overdue 45 · due soon 34 · revenue at risk Tk 809,300
call list 41 vehicles · top priority score 419
backlog 45 items / Tk 387,700 · churn 20 vehicles · retention 52%
8-week forecast 43 visits / Tk 486,300 · peak week 2 at Tk 121,700
km/day range 18-80 (must vary — a fixed interval does not score)
```

**Constants:** `SOON_DAYS` 30, `DEFAULT_KM_PER_DAY` 25,
`MAX_PLAUSIBLE_KM_PER_DAY` 500, `CHURN_DAYS` 45, document warning 30.

**Priority formula:** 100 per overdue, 25 per due-soon, 1 per 500 BDT, 30 if not
called in 7 days. The staleness bonus must be worth *exactly* 30; `verify`
asserts this.

---

## Appendix F — Reproducing the screenshot and role tests

Playwright is **not** a project dependency. It was installed in a scratch
directory, and the machine has a cached Chromium at build 1223 while current
Playwright wants 1234 — so the launch must point at the cached binary:

```js
chromium.launch({
  executablePath:
    'C:/Users/faisa/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
})
```

Alternatively `npx playwright install chromium` downloads the matching build and
the override becomes unnecessary.

`scripts/test-roles.mjs` is in the repo and uses the default launch, so it needs
the matching browser installed. Set `BASE` to test a deployed URL.

**What the screenshot pass checks, beyond looking at it:** horizontal overflow
at 375px and 1440px, console errors, and that under `reducedMotion: 'reduce'` no
`[data-hero]` or `[data-reveal]` element is left below opacity 0.99.

---

## Appendix G — Environment and conventions

`.env.local` (gitignored; `.env.local.example` is the committed template):

```
NEXT_PUBLIC_SUPABASE_URL=https://gamiabikqpwqdtykzpzb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

`.gitignore` has `.env*` plus `!.env.local.example`.

Next reads `.env.local` **only at boot** — restart the dev server after editing.

**Vercel deploy:** import the repo, add the same three variables, deploy. No
build configuration needed. The two `NEXT_PUBLIC_` values are safe in the
browser; the secret key is server-only.

**Commits:** the repo has no commits yet. `EVENT.md` must be in the first
event-work commit. Commit messages end with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

PR bodies end with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Bangla reminder dictionary** lives in `lib/messages.ts` — twelve item names
(the fixed set the dataset uses) plus Bangla numeral conversion. An unrecognised
item falls back to English rather than being mangled.

---

## Appendix H — The P09 problem statement, verbatim

Kept in full because the judged constraints are precise and paraphrasing them
loses the parts that decide marks.

### Background
A car servicing workshop in Dhaka looks after a few hundred customer vehicles.
Every vehicle has parts with their own life. Engine oil is due after a few
months. Brake pads and tyres wear out with distance. A battery has a warranty
date. Fitness and insurance papers expire on a fixed date.

### Problem statement
All of this lives in a register book and in the manager's head. The workshop
finds out something was due only when the customer arrives with a problem, and
the customer finds out when the bill is bigger than it needed to be. The
workshop needs a tool that works out what is due on every vehicle and tells them
who to call today.

### The four scored MVP requirements
1. Create at least 40 vehicles belonging to at least 25 owners. Give each
   vehicle a set of service items with a rule: some due on a fixed date such as
   insurance and fitness, some due after a period of time such as engine oil,
   and some due after a distance such as brake pads and tyres. Include current
   odometer readings and past service records.
2. Work out a next due date for every item using its own rule. For distance
   based items, estimate the date using how far that vehicle runs per day. Mark
   every item as overdue, due soon, or fine.
3. Give the workshop a daily call list: which owner to call, which vehicle,
   which items are due and why. Sort it so the most overdue and the highest
   value work comes first.
4. Give each owner a vehicle page showing every item, its next due date and its
   cost. Let the workshop record a completed service so that item resets and the
   service history grows.

### Bonus features (only after all four work)
- Show how much work is coming in the next 8 weeks so the workshop can see busy
  weeks in advance. — **built** (`/analytics`)
- Let the workshop enter a new odometer reading and have every distance based
  estimate update. — **built** (`OdometerForm`)
- Create a copy ready reminder message per owner naming the items due and the
  cost. — **built** (`ReminderPanel`, EN and বাংলা)

### Constraints — these are the mark-losing traps
> Distance based items must use the vehicle's daily running. A fixed interval
> for everything will not score.

Handled by `dailyRun()`, measured per vehicle from its own odometer history.
`verify` asserts the rate varies (18–80 km/day across the seeded workshop).

> Recording a completed service must reset that one item only.

Handled by appending a `service_history` row scoped to
`(vehicle_id, item_name)`. `npm test` services all 165 items one at a time and
asserts no other item's date moves.

> The call list must be sorted by a rule you can explain, not just a list of
> everything not fine.

The formula is printed on the call desk page itself, and lives in
`PRIORITY_RULE` in `lib/scoring.ts` so the UI text and the computation cannot
drift apart.

---

## Appendix I — Dataset shape reference

`data/P09_vehicle_service_public.json`, schema version 2.1, `problem_id: P09`,
25 cases. One case:

```json
{
  "case_id": "PUB-01",
  "today": "2026-08-30",
  "owners": [
    { "id": "O01", "name": "Rahim Uddin", "phone": "01711223344" }
  ],
  "vehicles": [{
    "id": "V01",
    "owner_id": "O01",
    "model": "Toyota Axio",
    "plate": "Dhaka Metro Ga 12-3456",
    "odometer_readings": [
      { "date": "2026-07-31", "km": 59935 },
      { "date": "2026-08-30", "km": 60835 }
    ],
    "service_items": [
      { "name": "Insurance",  "rule": "fixed_date",    "due_date": "2026-09-04", "cost_bdt": "12000.00" },
      { "name": "Air filter", "rule": "period_months", "every_months": 6,        "cost_bdt": "1200.00"  },
      { "name": "Brake pads", "rule": "distance_km",   "every_km": 10000,        "cost_bdt": "6000.00"  }
    ],
    "service_history": [
      { "item": "Air filter", "date": "2026-02-26", "km": null,  "cost_bdt": "1200.00" },
      { "item": "Brake pads", "date": "2026-04-11", "km": 50835, "cost_bdt": "6000.00" }
    ]
  }]
}
```

**Field notes that matter**
- `cost_bdt` is a **string** everywhere — `parseFloat` before arithmetic.
- `km` is `null` on `period_months` history rows. Never read it on that branch.
- The latest odometer reading of every vehicle is dated exactly `today`.
- `today` is a case field. The dataset's own `format_note` says: *"`today` is a
  case field, never the clock."*

**The twelve item names** (the complete fixed set, which is why the Bangla
dictionary in `lib/messages.ts` can be exhaustive):
Fitness certificate · Battery warranty · AC service · Air filter · Tyres ·
Tax token · Insurance · Engine oil · Timing belt · Spark plugs · Coolant ·
Brake pads.

**Ten vehicle models:** Toyota Axio, Mitsubishi Pajero, Toyota Premio, Toyota
Hiace, Toyota Noah, Nissan X-Trail, Toyota Allion, Suzuki Alto, Honda Vezel,
Honda Grace.

---

## Appendix J — The dating algorithm, exactly

`lib/engine.ts`. Reproduced here so it can be checked without reading code.

### Daily running
```
sorted   = odometer_readings ordered by date
first    = sorted[0], last = sorted[-1]
if fewer than 2 readings:  rate = DEFAULT_KM_PER_DAY (25), estimated = true
else:                      span = max(1, days(first.date, last.date))
                           rate = max(0.1, (last.km - first.km) / span)
```

### Next due date, per rule
```
fixed_date      due = item.due_date
                basis: "Fixed expiry date — <date>. Does not depend on use."

period_months   hist = latest history row for this item
                due  = addMonths(hist.date, item.every_months)
                basis: "Last done <date>, due every <n> months."

distance_km     hist   = latest history row for this item
                dueOdo = hist.km + item.every_km
                kmLeft = dueOdo - last.km
                due    = addDays(last.date, round(kmLeft / rate))
                basis: "Last done at <hist.km> km, due every <every_km> km ->
                        due at <dueOdo> km. Now <last.km> km,
                        <so N km left | already N km past it> at <rate> km/day."
```

### Month arithmetic
`addMonths` **clamps to the last valid day of the target month**: 31 Jan plus
one month is 28 Feb, not 3 Mar. A service due in February must not land in
March because the source month was longer. All date maths runs in **UTC** so it
cannot drift with the server timezone.

### Status bands
```
daysUntil < 0            -> overdue
daysUntil <= SOON_DAYS   -> due_soon     (SOON_DAYS = 30)
otherwise                -> fine
```

### Two ordering scores, deliberately separate
- `urgencyOf(daysUntil, cost) = -daysUntil * 10 + cost / 1000` — orders items
  **within** one vehicle.
- `callPriority(items, lastCalledAt, today)` — orders **vehicles** on the call
  desk. Lives in `scoring.ts`, weighs status, total value and contact recency.

---

## Appendix K — Database internals

### Tables (9)
`app_config` · `owners` · `vehicles` · `odometer_readings` · `service_items` ·
`service_history` · `service_jobs` · `call_logs` · `profiles`
Plus, after `migration-roles.sql`: `inspections` · `inspection_items` ·
`service_requests`.

### Constraints worth knowing
- **`service_items.rule_shape`** — a `fixed_date` item must have `due_date` and
  neither interval; `period_months` must have `every_months` only;
  `distance_km` must have `every_km` only. An item with the wrong shape is
  **unstorable** rather than silently undatable at render time.
- **`profiles.customer_needs_owner`** — a row with `role = 'customer'` must
  carry an `owner_id`. A customer account can never exist unscoped.
- **`service_history`** has a composite foreign key to
  `service_items (vehicle_id, name)`, so history cannot reference an item the
  vehicle does not have.

### The four RLS helper functions
All `SECURITY DEFINER`, which is required: they read `profiles` from inside
`profiles` policies, and without it the policy would recurse into itself.

| Function | Returns |
|---|---|
| `auth_role()` | the signed-in user's role, or null |
| `auth_owner_id()` | the owner a customer profile is scoped to |
| `is_staff()` | true for admin, manager, technician — **not** customer |
| `can_write_work()` | true for admin and manager only — the office, not the floor |

### Policy shape
Staff read everything. A customer reads only rows reachable from their
`owner_id`, via an `exists (select 1 from vehicles v where ...)` subquery on
each child table. Writes are gated by `can_write_work()`, except odometer
readings which use `is_staff()` because technicians take readings at intake.

### SQL files, and which are live
| File | Status |
|---|---|
| `schema.sql` | **Run.** The full setup for a fresh project. |
| `policies-anon.sql` | **Run, now being reversed.** Superseded by the migration. |
| `revoke-anon.sql` | **Superseded** — a subset of `migration-roles.sql`. Safe to delete. |
| `migration-roles.sql` | **NOT RUN.** See §7. |

---

## Appendix L — Bugs found, and how

Recorded because the *how* is reusable, not just the fix.

**RLS was decorative for reads.** `loadCase` used the service-role client, which
bypasses every policy — a signed-in customer would have seen all 42 vehicles.
Caught by comparing two REST calls directly: the anon key returned `[]`, the
secret key returned all 27 owners. Fix: reads moved to the session client, and
explicit `anon` policies added for the then-public demo.

**`-727 km left`.** A vehicle past its distance mark produced a negative "km
left" in the reasoning string shown to a service adviser. Caught by
**screenshotting the page**, not by reading HTML. Now reads "already 727 km past
it". `verify` asserts no reasoning string ever contains a negative "km left".

**"Busiest week 7"** where 7 was the vehicle count, not week 7 — the hint line
underneath said "week 2". Caught by screenshot. Relabelled "Peak week vehicles".

**Reveal targets stranded invisible.** An early version set `opacity: 0` in CSS
for GSAP to animate from, which would have left the page blank if JS failed.
Fix: `gsap.from()` inside `useLayoutEffect`, so served HTML is visible and the
start state is applied before paint.

**Build crashed on placeholder env values.** `.env.local` shipped with
`PASTE_..._HERE` markers, which are non-empty and so passed a truthiness check,
then threw inside the Supabase client at build time. Fix: `lib/supabase/config.ts`
validates the URL shape and rejects placeholder markers.

**404s return HTTP 200.** Chased through three hypotheses — async layout, then
the error boundary, then the real cause. Confirmed by `Transfer-Encoding:
chunked`: `loading.tsx` wraps every route in Suspense, so the status line is
flushed before `notFound()` can throw. Kept the skeletons; documented the
trade-off.

**Sign-up "redirect failure" that wasn't.** The test asserted the URL 2s after
submit; the action takes ~2.4s (createUser, profile insert, sign-in). Re-tested
with a polling loop and it redirected at +2s. No code change — the test was
wrong, not the app.

**Circular import.** `engine.ts` needed `callPriority` from `scoring.ts`, which
needed `dailyRun` from `engine.ts`. Broken by giving `scoring.ts` a local
three-line `latestReading()` rather than importing back — duplication was the
cheaper cost.

**`middleware.ts` deprecated in Next 16.** Renamed to `proxy.ts` exporting
`proxy`, which cleared the build warning.

**Nowrap fix caused overflow.** Adding `whitespace-nowrap` to the landing
header's "Sign in" stopped it wrapping but made the header unable to shrink at
375px. Fix: shorten the primary CTA label below `sm` instead. Caught by the
overflow assertion in the screenshot pass.
