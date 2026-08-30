/**
 * Runs the whole engine and every derived score against all 25 dataset cases.
 * Pure logic only — no database, no React.
 */
import raw from "../data/P09_vehicle_service_public.json";
import {
  analyse,
  buildCallList,
  dailyRun,
  DEFAULT_KM_PER_DAY,
  SOON_DAYS,
} from "../lib/engine";
import {
  callPriority,
  churnRisk,
  healthScore,
  odometerAnomaly,
  partsRequisition,
  weeklyBuckets,
  CHURN_DAYS,
  MAX_PLAUSIBLE_KM_PER_DAY,
} from "../lib/scoring";
import type { WorkshopCase } from "../lib/types";

const cases = (raw as { cases: WorkshopCase[] }).cases;

let failures = 0;
const fail = (msg: string) => {
  console.error(`  ✗ ${msg}`);
  failures++;
};

/* --------------------------------------------------- dating, all 25 cases */

const tally = { overdue: 0, due_soon: 0, fine: 0 };
let totalItems = 0;
let skipped = 0;

for (const c of cases) {
  const declared = c.vehicles.reduce((n, v) => n + v.service_items.length, 0);
  totalItems += declared;
  const rows = analyse(c);
  skipped += declared - rows.length;

  for (const r of rows) {
    tally[r.status]++;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.due)) fail(`${c.case_id} ${r.itemName}: bad date ${r.due}`);
    if (Number.isNaN(r.cost)) fail(`${c.case_id} ${r.itemName}: NaN cost`);
    if (!r.basis) fail(`${c.case_id} ${r.itemName}: empty reasoning`);
    if (r.basis.includes("-") && r.basis.includes("km left")) {
      fail(`${c.case_id} ${r.itemName}: negative "km left" in reasoning`);
    }
  }
}

console.log(`cases=${cases.length} items=${totalItems} SOON_DAYS=${SOON_DAYS}`);
console.log("status spread:", tally);
console.log(`undatable (skipped): ${skipped}`);

/* --------------------------------------------------------- derived scores */

for (const c of cases) {
  const rows = analyse(c);

  // health: bounded, and a fully-fine vehicle must read 100
  for (const v of c.vehicles) {
    const mine = rows.filter((r) => r.vehicleId === v.id);
    const h = healthScore(mine);
    if (h < 0 || h > 100) fail(`${c.case_id} ${v.plate}: health ${h} out of range`);
    if (mine.length && mine.every((i) => i.status === "fine") && h !== 100) {
      fail(`${c.case_id} ${v.plate}: all items fine but health ${h}`);
    }
    if (mine.length && mine.every((i) => i.status === "overdue") && h !== 0) {
      fail(`${c.case_id} ${v.plate}: all items overdue but health ${h}`);
    }
  }

  // priority: never negative, and an overdue vehicle must outrank a fine one
  for (const v of c.vehicles) {
    const mine = rows.filter((r) => r.vehicleId === v.id);
    const p = callPriority(mine, null, c.today);
    if (p < 0) fail(`${c.case_id} ${v.plate}: negative priority ${p}`);
    const allFine = mine.every((i) => i.status === "fine");
    const anyOverdue = mine.some((i) => i.status === "overdue");
    if (anyOverdue && p < 100) fail(`${c.case_id} ${v.plate}: overdue but priority ${p}`);
    if (allFine && mine.length && p > 30) {
      fail(`${c.case_id} ${v.plate}: nothing due but priority ${p}`);
    }
  }

  // staleness bonus must be worth exactly its stated points
  const sample = rows.filter((r) => r.vehicleId === c.vehicles[0].id);
  const stale = callPriority(sample, null, c.today);
  const fresh = callPriority(sample, c.today, c.today);
  if (stale - fresh !== 30) {
    fail(`${c.case_id}: staleness bonus is ${stale - fresh}, expected 30`);
  }

  // forecast: every row is accounted for exactly once
  const f = weeklyBuckets(rows, c.today, 8);
  const bucketed = f.buckets.reduce((n, b) => n + b.items.length, 0);
  const beyond = rows.filter((r) => r.daysUntil >= 56).length;
  if (bucketed + f.backlog.length + beyond !== rows.length) {
    fail(
      `${c.case_id}: forecast lost rows — ${bucketed}+${f.backlog.length}+${beyond} != ${rows.length}`
    );
  }
  if (f.backlog.some((r) => r.daysUntil >= 0)) {
    fail(`${c.case_id}: non-overdue item in backlog`);
  }
  for (const b of f.buckets) {
    if (b.items.some((r) => r.daysUntil < 0)) fail(`${c.case_id} week ${b.index}: overdue item bucketed`);
    if (b.vehicles > b.items.length) fail(`${c.case_id} week ${b.index}: more vehicles than items`);
  }

  // parts: counts must reconcile with the items they came from
  for (const b of f.buckets) {
    const parts = partsRequisition(b.items);
    const counted = parts.reduce((n, p) => n + p.count, 0);
    if (counted !== b.items.length) {
      fail(`${c.case_id} week ${b.index}: parts count ${counted} != ${b.items.length}`);
    }
  }

  // churn: strictly a subset of the deeply overdue
  for (const e of churnRisk(rows)) {
    if (e.worstDays >= -CHURN_DAYS) {
      fail(`${c.case_id} ${e.plate}: churn entry only ${e.worstDays}d overdue`);
    }
  }
}

/* ------------------------------------------------------- odometer anomaly */

{
  const v = cases[0].vehicles[0];
  const { last } = dailyRun(v);

  if (odometerAnomaly(v, last.km - 1, cases[0].today)?.kind !== "rollback") {
    fail("a reading below the last one was not flagged as a rollback");
  }
  const wild = last.km + MAX_PLAUSIBLE_KM_PER_DAY * 400;
  if (odometerAnomaly(v, wild, cases[0].today)?.kind !== "jump") {
    fail("an implausible jump was not flagged");
  }
  if (odometerAnomaly(v, last.km + 50, cases[0].today) !== null) {
    fail("a normal reading was flagged as an anomaly");
  }
}

/* --------------------------------------------------- new-vehicle fallback */

{
  const v = cases[0].vehicles[0];
  const single = { ...v, odometer_readings: [v.odometer_readings[0]] };
  const run = dailyRun(single);
  if (run.rate !== DEFAULT_KM_PER_DAY || !run.estimated) {
    fail(`one reading should fall back to ${DEFAULT_KM_PER_DAY} km/day, got ${run.rate}`);
  }
  if (dailyRun(v).estimated) fail("a vehicle with full history was marked estimated");
}

/* ------------------------------------------------------------ sample view */

const c1 = cases[0];
const rows = analyse(c1);
const list = buildCallList(rows, c1.today);
const rates = c1.vehicles.map((v) => dailyRun(v).rate);
const f = weeklyBuckets(rows, c1.today, 8);

console.log(`\n=== ${c1.case_id} today=${c1.today} ===`);
console.log(`vehicles=${c1.vehicles.length} owners=${c1.owners.length} callList=${list.length}`);
console.log(
  `km/day min=${Math.min(...rates).toFixed(1)} max=${Math.max(...rates).toFixed(1)}` +
    " (must vary — a fixed interval does not score)"
);
console.log(
  `backlog=${f.backlog.length} items (Tk ${f.backlogRevenue.toLocaleString()})  ` +
    `churn=${churnRisk(rows).length} vehicles`
);
console.log("8-week forecast:");
for (const b of f.buckets) {
  const bar = "█".repeat(Math.round((b.revenue / Math.max(1, f.peakRevenue)) * 28));
  console.log(
    `  w${b.index} ${b.start}  ${String(b.vehicles).padStart(2)} vehicles  ` +
      `Tk ${String(b.revenue.toLocaleString()).padStart(8)}  ${bar}`
  );
}
const top = partsRequisition(f.buckets[0].items).slice(0, 4);
console.log(
  "week 1 parts:",
  top.map((p) => `${p.count}× ${p.name}`).join(", ") || "none"
);

console.log(
  failures === 0
    ? "\n✓ all checks passed"
    : `\n✗ ${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
