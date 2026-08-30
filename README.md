# ServiceDue — Vehicle Service Due Predictor

**Problem P09 · Team T069 · LofiStack Hackathon 2026**

A Dhaka car workshop keeps its service register in a book and in the manager's
head, so it finds out something was due only when the customer turns up with a
problem. ServiceDue works out what is due on every vehicle it looks after, and
tells the workshop **who to call today**.

Live demo: _add your Vercel URL here_

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
dates.

Every item is then graded **overdue**, **due soon** (within 30 days) or **fine**.

### The four required capabilities

**1 · A seeded workshop.** 42 vehicles across 27 owners, each with 3–5 service
items spanning all three rule types, 2–4 odometer readings, and past service
records. Loaded from the supplied public dataset (case `PUB-01`).

**2 · A next due date for every item, with a status.** `lib/engine.ts` dates all
165 items on the seeded workshop with no gaps, and grades each one.

**3 · A daily call list.** The home page groups everything not `fine` by owner
and vehicle, most urgent first, and shows **why** each item is due in that
vehicle's real numbers — for example:

> *Last done at 129,498 km, due every 10,000 km → due at 139,498 km. Now 139,372 km, so 126 km left at 51.9 km/day.*

The ordering rule is stated on the page itself:

```
urgency = (days overdue × 10) + (cost ÷ 1000)
```

Days overdue dominates, so nothing merely due-soon can outrank an overdue item;
cost only breaks ties between items of similar lateness.

**4 · A vehicle page with service recording.** Each vehicle shows every item,
its next due date, its status, its cost and its reasoning, plus the full service
history. **Mark done** records a completed service, which resets *that item only*
— verified by `npm test`, which services 165 items one at a time and asserts no
other item's due date moves.

### Also built

- **Odometer update** — entering a new reading re-derives the vehicle's daily
  running, so every distance-based estimate on that vehicle moves with it.
- **Vehicle register** with search by plate, model or owner.
- Skeleton loading states, an error boundary, an empty state per list, and a
  not-found page. Tap-to-call links on every phone number.
- Light and dark themes; the layout works down to a phone-width screen.

---

## How to run it

```bash
npm install
npm run dev          # http://localhost:3000
```

It runs with no configuration — see *What is mocked* below.

### With Supabase (the persistent path)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.local.example` to `.env.local` and fill in both values from
   **Project Settings → API**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```

4. Seed the workshop:

   ```bash
   npm run seed
   ```

5. `npm run dev`. Recorded services and odometer readings now persist.

### Deploying to Vercel

Import the repository, add the same two environment variables, deploy. No build
configuration is needed.

### Other commands

```bash
npm run verify   # dates all 4,188 items across all 25 dataset cases
npm test         # asserts a recorded service resets exactly one item
npm run build    # production build
```

---

## What is mocked

- **The workshop is seeded from the supplied dataset**, not from live customer
  records. `data/P09_vehicle_service_public.json` is the hackathon's public
  dataset for P09, used unmodified.
- **"Today" is a data field, not the clock.** The seeded case fixes the
  workshop's date at **30 August 2026**, and every due date on screen is measured
  from it. This is deliberate: the demo shows the same overdue items whenever it
  is opened, instead of drifting further out of date each day. It is shown in the
  page header so nothing on screen is ambiguous.
- **There is no authentication.** Every visitor sees the same workshop. A real
  deployment would scope data to a signed-in workshop account.
- **No SMS or calls are sent.** Phone numbers are `tel:` links that open the
  device dialler.
- **Without Supabase credentials the app falls back to reading the bundled
  JSON**, so a clean checkout runs end to end. In that mode writes are held in
  process memory and are lost on restart. With Supabase configured, Postgres is
  the source of truth and writes persist.

### Known limitation

`app/loading.tsx` gives every route a streaming skeleton, and because the
response is streamed the status line is flushed before a page can call
`notFound()`. A request for a vehicle that does not exist therefore renders the
correct "Vehicle not found" page but returns HTTP 200 rather than 404. The
skeletons were judged the better trade for a dashboard whose pages each run a
full workshop query.

---

## What would be built next

1. **An eight-week workload view.** The engine already produces a dated,
   costed list of every upcoming item, so bucketing it by week would let the
   workshop see busy weeks before they arrive and pull work forward.
2. **Copy-ready reminder messages per owner**, naming the due items and the
   total cost, so the front desk can paste straight into WhatsApp.
3. **Per-item due-soon windows.** A 30-day warning suits an oil change; an
   insurance renewal deserves 60 and a timing belt rather less. The threshold is
   one constant (`SOON_DAYS`) and would become a per-item column.
4. **Confidence on distance estimates.** Daily running is measured over 20–173
   days depending on the vehicle. A vehicle with a short reading history should
   show a wider date range rather than a single confident day.
5. **Auth and multi-workshop scoping**, plus an audit trail on recorded
   services — currently any visitor can mark work done.

---

## How it is put together

```
app/
  page.tsx               call list — grouping, filters, ordering rule
  vehicles/page.tsx      register with search
  vehicles/[id]/page.tsx one vehicle: items, history, odometer
  actions.ts             server actions for recording work
  loading|error|not-found.tsx
lib/
  engine.ts              due dates, statuses, urgency, call list  (pure)
  dates.ts               UTC date maths, month-end clamping       (pure)
  data.ts                Supabase reads/writes + JSON fallback
  supabase.ts            server-only client
supabase/schema.sql      tables, constraints, indexes, RLS
scripts/                 seed, verify, test
```

The scoring logic in `lib/engine.ts` and `lib/dates.ts` is pure and has no
knowledge of React or Supabase, which is what lets `npm run verify` date all
4,188 items across all 25 dataset cases and `npm test` prove the reset
constraint without a database.

**Data model notes.** Each service item carries only the parameters its rule
needs, enforced by a check constraint, so an item with the wrong shape cannot be
stored rather than failing to date at render time. Time-based history rows carry
a null odometer, because no reading is taken for an air filter. Reads are
public via RLS; every write goes through a server action using the service-role
key, which never reaches the browser.
