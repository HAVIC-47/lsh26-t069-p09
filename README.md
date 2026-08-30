# ServiceDue — Vehicle Service Due Predictor

**Problem P09 · Team T069 · LofiStack Hackathon 2026**

A Dhaka car workshop keeps its service register in a book and in the manager's
head, so it finds out something was due only when the customer turns up with a
problem. ServiceDue dates every part on every vehicle by its own rule, and tells
the workshop **who to call today**.

Live demo: _add your Vercel URL here_

**No account is needed to look around.** The workshop is readable signed out;
signing in adds role-scoped views and the ability to record work.

| Role | Email | Sees |
|---|---|---|
| Workshop Admin | `admin@ridecatalyst.demo` | Everything |
| Workshop Manager | `manager@ridecatalyst.demo` | Call desk, analytics, documents; records work |
| Service Technician | `tech@ridecatalyst.demo` | Vehicles and history read-only; takes odometer readings |
| Vehicle Owner | `owner@ridecatalyst.demo` | Only their own 3 vehicles |

Password for all four: `RideCatalyst!2026`

---

## What it does

Every part on a vehicle wears out on its own clock, so the app dates each one by
its own rule:

| Rule | Applies to | How the next due date is worked out |
|---|---|---|
| `fixed_date` | Insurance, fitness certificate, tax token, battery warranty | The printed expiry date. Does not depend on use. |
| `period_months` | Engine oil, air filter, coolant, AC service | Last service date + the item's interval in months, clamped to the end of a short month. |
| `distance_km` | Brake pads, tyres, spark plugs, timing belt | Odometer at last service + the item's km interval, converted to a **date** using that vehicle's own measured daily running. |

Distance-based items never use a fixed interval. Each vehicle's km/day comes
from its own odometer history — across the seeded workshop that ranges from
**18 to 80 km/day**, so two vehicles with identical brake pads get different due
dates. A vehicle with only one reading falls back to a documented 25 km/day
until a second reading exists.

Every item is then graded **overdue**, **due soon** (within 30 days) or **fine**.

### The four required capabilities

**1 · A seeded workshop.** 42 vehicles across 27 owners, each with 3–5 service
items spanning all three rule types, 2–4 odometer readings, and past service
records. Loaded from the supplied public dataset (case `PUB-01`).

**2 · A next due date for every item, with a status.** `lib/engine.ts` dates all
165 items with no gaps and grades each one.

**3 · A daily call list.** The call desk groups everything not `fine` by owner
and vehicle, highest priority first, and shows **why** each item is due in that
vehicle's real numbers — for example:

> *Last done at 129,498 km, due every 10,000 km → due at 139,498 km. Now 139,372 km, so 126 km left at 51.9 km/day.*

The ordering rule is printed on the page itself:

```
priority = 100 per overdue item
         + 25 per due-soon item
         + 1 per 500 BDT of pending work
         + 30 when nobody has called in 7 days
```

Status dominates, value breaks ties, and the staleness bonus stops a lead being
dropped because it sits mid-table.

**4 · A vehicle page with service recording.** Each vehicle shows every item,
its next due date, status, cost and reasoning, plus the full service history.
**Mark done** records a completed service, which resets *that item only* —
verified by `npm test`, which services 165 items one at a time and asserts no
other item's due date moves.

### Beyond the four

- **Fleet analytics** — 8-week workload and revenue forecast as inline SVG,
  parts requisition for the coming month, and churn detection (a predicted
  service that lapsed more than 45 days ago with nothing recorded since).
- **Document expiry vault** — insurance, fitness, tax token and battery warranty
  get a wider 30-day warning window than a mechanical service, because the
  consequence is a fine rather than a repair bill.
- **Bilingual reminders** — a message built from the vehicle's real due items and
  costs, in English or বাংলা with Bangla numerals, one click to copy or to open
  WhatsApp with the customer's number already filled in.
- **Odometer anomaly guard** — a reading below the last one is refused outright;
  one implying more than 500 km/day is explained and can be confirmed. A bad
  reading would corrupt every distance estimate on the vehicle.
- **Vehicle health score** and a searchable register.
- Skeleton loading states, an error boundary, an empty state per list, a
  not-found page, light and dark themes, and layouts that work at 375px.

---

## Roles and security

Four roles, enforced in two places:

1. **Row-level security in Postgres.** Page reads go through a *session* client
   carrying the signed-in user's JWT, so policies actually apply. A signed-out
   visitor reads through explicit `anon` policies — select only, no insert,
   update or delete anywhere.
2. **A permission check in every server action.** Writes use the service-role
   client, which bypasses RLS by design, so `requirePermission()` in
   `lib/auth.ts` — not the database policy — is what actually stops an
   unauthorised write.

`scripts/test-roles.mjs` checks this end to end, including the case that
matters: **a signed-in customer cannot reach another owner's vehicle.**

```
SIGNED OUT   42 vehicles, writes refused with a reason
MANAGER      42 vehicles
TECHNICIAN   42 vehicles
ADMIN        42 vehicles
CUSTOMER      3 vehicles · own V01 opens · V02 unreachable
```

**Sign-up creates customer accounts only.** Staff accounts are made by an admin,
so nobody can grant themselves workshop access. A sign-up is verified against a
phone number already on the register.

---

## How to run it

```bash
npm install
npm run dev          # http://localhost:3000
```

It runs with no configuration at all — see *What is mocked*.

### With Supabase (the persistent path)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.local.example` to `.env.local` and fill in the three values from
   **Project Settings → API Keys**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   ```

4. Seed the workshop and the four demo accounts:

   ```bash
   npm run seed
   ```

5. `npm run dev`. Next reads `.env.local` only at boot, so restart if it was
   already running.

`supabase/policies-anon.sql` is included in `schema.sql`; it exists separately
so it can be applied to an already-seeded database without dropping anything.

### Deploying to Vercel

Import the repository, add the same three environment variables, deploy. No
build configuration needed.

### Commands

```bash
npm run verify   # dates and scores all 4,188 items across all 25 dataset cases
npm test         # asserts a recorded service resets exactly one item
npm run build    # production build
node scripts/test-roles.mjs   # role scoping (needs playwright — see the file)
```

---

## What is mocked

- **The workshop is seeded from the supplied dataset**, not from live customer
  records. `data/P09_vehicle_service_public.json` is the hackathon's public
  dataset for P09, used unmodified.
- **"Today" is a data field, not the clock.** The seeded case fixes the
  workshop's date at **30 August 2026**, and every due date on screen is measured
  from it. Deliberate: the demo shows the same overdue items whenever it is
  opened instead of drifting. It is shown on every page so nothing is ambiguous.
- **Sign-up verification is demo-grade.** It checks the phone number against the
  register and trusts whoever types it. A real deployment would send a one-time
  code to that number.
- **Demo account credentials are published above**, deliberately, so a judge can
  sign in as each role. There is no real customer data in this deployment.
- **No SMS is sent.** Phone numbers are `tel:` links; WhatsApp opens a prefilled
  `wa.me` link that the user still has to send.
- **Parts requisition is a requirement list, not a stock report.** The dataset
  carries no inventory levels, so nothing is reconciled against what the
  workshop actually holds.
- **Without Supabase credentials the app falls back to the bundled JSON**, so a
  clean checkout runs end to end. In that mode writes are held in process memory
  and lost on restart, and sign-in is unavailable.

### Not built

Vehicle fields the specification mentions but the dataset does not carry — VIN,
engine number, make, year, fuel type, vehicle category, owner email and address,
technician rosters, inventory levels — were **not** invented. Every number on
screen traces to the supplied dataset or to something a user entered. The
technician on a service record comes from the signed-in profile, which is real
rather than fabricated.

Digital inspection checklists are also not built: they need their own table, a
technician-facing mobile form, and a path for injecting flagged items into live
tracking, and nothing in the dataset seeds them.

### Known limitation

`app/(app)/loading.tsx` gives every workshop route a streaming skeleton, and
because the response is streamed the status line is flushed before a page can
call `notFound()`. A request for a vehicle that does not exist therefore renders
the correct "Vehicle not found" page but returns HTTP 200 rather than 404. The
skeletons were judged the better trade for a dashboard whose pages each run a
full workshop query.

---

## What would be built next

1. **Call dispositions.** The `call_logs` table and its policies exist and the
   priority score already consumes a last-called date; the UI to log *scheduled
   / no answer / postponed / declined* and reschedule the follow-up is the
   remaining piece.
2. **Multi-item job sheets.** `service_jobs` is in the schema so one visit can
   group several items with a technician and a note. Today a service is recorded
   one item at a time.
3. **Per-item due-soon windows.** A 30-day warning suits an oil change;
   insurance deserves 60 and a timing belt rather less. It is one constant
   (`SOON_DAYS`) that would become a per-item column.
4. **Confidence on distance estimates.** Daily running is measured over 20–173
   days depending on the vehicle. A short reading history should show a date
   range rather than a single confident day.
5. **Real sign-up verification** by one-time code, and an admin screen for
   creating staff accounts rather than seeding them.

---

## How it is put together

```
app/
  page.tsx                 landing page (GSAP hero + scroll reveals)
  (app)/                   workshop chrome — sidebar shell
    desk/                  call desk: priority ranking, filters, reminders
    vehicles/              register and one-vehicle detail
    analytics/             8-week forecast, parts, churn
    documents/             paperwork expiry vault
    login/  signup/        auth
  actions.ts               guarded server actions
lib/
  engine.ts                due dates, statuses, call list           (pure)
  scoring.ts               health, priority, forecast, churn        (pure)
  dates.ts                 UTC date maths, month-end clamping       (pure)
  messages.ts              EN/BN reminder templates                 (pure)
  auth.ts                  permission table + requirePermission()
  data.ts                  session-client reads, JSON fallback
  supabase/                config, session client, admin client
supabase/                  schema.sql, policies-anon.sql
scripts/                   seed, verify, test-reset, test-roles
proxy.ts                   Supabase session refresh
```

The scoring logic in `lib/engine.ts`, `lib/scoring.ts`, `lib/dates.ts` and
`lib/messages.ts` is pure and knows nothing about React or Supabase. That is
what lets `npm run verify` exercise the real logic against all 25 dataset cases
without a database — checking not just that dates come out, but that health
scores stay bounded, that an overdue vehicle always outranks a fine one, that
the staleness bonus is worth exactly its stated 30 points, that the forecast
loses no rows, that parts counts reconcile, and that all three odometer-anomaly
branches fire.

**Data model notes.** Each service item carries only the parameters its rule
needs, enforced by a check constraint, so an item with the wrong shape cannot be
stored rather than failing to date at render time. Time-based history rows carry
a null odometer, because no reading is taken for an air filter. A customer
profile must carry an `owner_id`, enforced by a check constraint, so a customer
account can never exist unscoped.

**Animation.** GSAP drives a hero stagger, KPI count-ups and scroll reveals,
budgeted at one or two animated elements per view. Every animation is wrapped in
`gsap.matchMedia()` with a `prefers-reduced-motion: reduce` branch that renders
the final state immediately and runs no scroll-driven motion at all. Reveals use
`gsap.from()`, so if JavaScript never runs the content is simply visible rather
than stranded at opacity zero.
