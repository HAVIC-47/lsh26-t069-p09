import { addDays, daysBetween } from "./dates";
import type { DueItem, Reading, Vehicle } from "./types";

/**
 * Local, so this module stays free of any import from engine.ts — engine.ts
 * imports callPriority from here, and a cycle between them would be worse than
 * three lines of duplication.
 */
function latestReading(v: Vehicle): Reading | null {
  if (v.odometer_readings.length === 0) return null;
  return [...v.odometer_readings].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date)
  )[v.odometer_readings.length - 1];
}

/* ------------------------------------------------------------------ health */

export const HEALTH_RULE =
  "Health = (items fine + half of items due soon) ÷ total items. " +
  "An overdue item contributes nothing, a due-soon item counts half, so a " +
  "vehicle drifts down before it fails rather than falling off a cliff.";

/** 0–100 for one vehicle's items. A vehicle with no tracked items reads 100. */
export function healthScore(items: DueItem[]): number {
  if (items.length === 0) return 100;
  const fine = items.filter((i) => i.status === "fine").length;
  const soon = items.filter((i) => i.status === "due_soon").length;
  return Math.round((100 * (fine + soon * 0.5)) / items.length);
}

export const healthBand = (score: number) =>
  score >= 80 ? "fine" : score >= 50 ? "due_soon" : "overdue";

/* ---------------------------------------------------------------- priority */

export const OVERDUE_POINTS = 100;
export const DUE_SOON_POINTS = 25;
export const TAKA_PER_POINT = 500;
export const STALE_CALL_DAYS = 7;
export const STALE_CALL_POINTS = 30;

export const PRIORITY_RULE =
  `Call priority = ${OVERDUE_POINTS} per overdue item + ${DUE_SOON_POINTS} per ` +
  `due-soon item + 1 per ${TAKA_PER_POINT} BDT of pending work + ` +
  `${STALE_CALL_POINTS} when the customer has not been called in ` +
  `${STALE_CALL_DAYS} days. Status dominates, value breaks ties, and the ` +
  `staleness bonus stops a lead being dropped because it sits mid-table.`;

/**
 * Ranking score for one vehicle's row on the call desk.
 * `lastCalledAt` is null when the customer has never been called, which counts
 * as stale — never contacted is the most dropped a lead can be.
 */
export function callPriority(
  items: DueItem[],
  lastCalledAt: string | null,
  today: string
): number {
  const pending = items.filter((i) => i.status !== "fine");

  let score = 0;
  for (const i of pending) {
    score += i.status === "overdue" ? OVERDUE_POINTS : DUE_SOON_POINTS;
  }
  score += pending.reduce((n, i) => n + i.cost, 0) / TAKA_PER_POINT;

  const stale =
    !lastCalledAt || daysBetween(lastCalledAt, today) > STALE_CALL_DAYS;
  if (stale) score += STALE_CALL_POINTS;

  return Math.round(score);
}

/* ------------------------------------------------------- weekly forecasting */

export type WeekBucket = {
  index: number;
  start: string;
  /** Inclusive. */
  end: string;
  items: DueItem[];
  vehicles: number;
  revenue: number;
};

export type Forecast = {
  buckets: WeekBucket[];
  /** Already overdue — work waiting now, not upcoming. */
  backlog: DueItem[];
  backlogRevenue: number;
  peakRevenue: number;
};

/**
 * Buckets upcoming work into consecutive weeks from the workshop's today.
 * Overdue items are kept separate: they are a backlog to clear, not capacity
 * to plan for, and folding them into week 1 would overstate that week.
 */
export function weeklyBuckets(
  rows: DueItem[],
  today: string,
  weeks = 8
): Forecast {
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => ({
    index: i + 1,
    start: addDays(today, i * 7),
    end: addDays(today, i * 7 + 6),
    items: [],
    vehicles: 0,
    revenue: 0,
  }));

  const backlog: DueItem[] = [];

  for (const r of rows) {
    if (r.daysUntil < 0) {
      backlog.push(r);
      continue;
    }
    const idx = Math.floor(r.daysUntil / 7);
    if (idx < weeks) buckets[idx].items.push(r);
  }

  for (const b of buckets) {
    b.vehicles = new Set(b.items.map((i) => i.vehicleId)).size;
    b.revenue = b.items.reduce((n, i) => n + i.cost, 0);
  }

  return {
    buckets,
    backlog,
    backlogRevenue: backlog.reduce((n, i) => n + i.cost, 0),
    peakRevenue: Math.max(0, ...buckets.map((b) => b.revenue)),
  };
}

/* ------------------------------------------------------ parts requisition */

export type PartLine = { name: string; count: number; cost: number };

/**
 * What the workshop must have in stock for a given set of due items.
 * Counts item names, which is what the dataset actually carries — there is no
 * inventory level to reconcile against, so this is a requirement list, not a
 * stock report.
 */
export function partsRequisition(items: DueItem[]): PartLine[] {
  const lines = new Map<string, PartLine>();
  for (const i of items) {
    const line = lines.get(i.itemName) ?? { name: i.itemName, count: 0, cost: 0 };
    line.count += 1;
    line.cost += i.cost;
    lines.set(i.itemName, line);
  }
  return [...lines.values()].sort(
    (a, b) => b.count - a.count || b.cost - a.cost
  );
}

/* ------------------------------------------------------------------- churn */

export const CHURN_DAYS = 45;

export type ChurnEntry = {
  vehicleId: string;
  plate: string;
  model: string;
  ownerName: string;
  ownerPhone: string;
  worstDays: number;
  items: DueItem[];
  value: number;
};

/**
 * Vehicles whose predicted service date passed more than `thresholdDays` ago
 * with nothing recorded since — the workshop has effectively lost them.
 */
export function churnRisk(
  rows: DueItem[],
  thresholdDays = CHURN_DAYS
): ChurnEntry[] {
  const lapsed = rows.filter((r) => r.daysUntil < -thresholdDays);
  const byVehicle = new Map<string, ChurnEntry>();

  for (const r of lapsed) {
    let e = byVehicle.get(r.vehicleId);
    if (!e) {
      e = {
        vehicleId: r.vehicleId,
        plate: r.plate,
        model: r.model,
        ownerName: r.ownerName,
        ownerPhone: r.ownerPhone,
        worstDays: 0,
        items: [],
        value: 0,
      };
      byVehicle.set(r.vehicleId, e);
    }
    e.items.push(r);
    e.value += r.cost;
    e.worstDays = Math.min(e.worstDays, r.daysUntil);
  }

  return [...byVehicle.values()].sort((a, b) => a.worstDays - b.worstDays);
}

/* -------------------------------------------------------- odometer anomaly */

export const MAX_PLAUSIBLE_KM_PER_DAY = 500;

export type Anomaly = { kind: "rollback" | "jump"; message: string } | null;

/**
 * Guards the odometer history, since every distance-based estimate divides by
 * a rate derived from it. A bad reading corrupts every due date on the vehicle,
 * so the entry is questioned rather than silently accepted.
 */
export function odometerAnomaly(
  v: Vehicle,
  km: number,
  date: string
): Anomaly {
  const last = latestReading(v);
  if (!last) return null;

  if (km < last.km) {
    return {
      kind: "rollback",
      message:
        `Reading ${km.toLocaleString()} km is below the last recorded ` +
        `${last.km.toLocaleString()} km on ${last.date}. An odometer does not ` +
        `run backwards — check the digits before saving.`,
    };
  }

  const days = Math.max(1, daysBetween(last.date, date));
  const impliedRate = (km - last.km) / days;
  if (impliedRate > MAX_PLAUSIBLE_KM_PER_DAY) {
    return {
      kind: "jump",
      message:
        `That is ${Math.round(impliedRate).toLocaleString()} km/day since ` +
        `${last.date} — above the ${MAX_PLAUSIBLE_KM_PER_DAY} km/day plausibility ` +
        `limit. Confirm the reading, or every distance estimate on this vehicle ` +
        `will be wrong.`,
    };
  }

  return null;
}

/* ----------------------------------------------------------- revenue */

export type MonthRevenue = { month: string; label: string; total: number; jobs: number };

const MONTH_LABEL = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Recorded revenue by calendar month, oldest first, from actual service
 * history. This is money already taken, not a projection — the forecast in
 * weeklyBuckets covers what is still to come.
 */
export function revenueByMonth(
  history: { date: string; cost_bdt: string }[],
  months = 6,
  today?: string
): MonthRevenue[] {
  const buckets = new Map<string, { total: number; jobs: number }>();

  for (const h of history) {
    const ym = h.date.slice(0, 7);
    const b = buckets.get(ym) ?? { total: 0, jobs: 0 };
    b.total += parseFloat(h.cost_bdt);
    b.jobs += 1;
    buckets.set(ym, b);
  }

  // Anchor on the workshop's today so empty recent months still appear —
  // a month with no work is a real signal, not a gap to hide.
  const anchor = today ? today.slice(0, 7) : [...buckets.keys()].sort().pop();
  if (!anchor) return [];

  const [ay, am] = anchor.split("-").map(Number);
  const out: MonthRevenue[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ay, am - 1 - i, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(ym) ?? { total: 0, jobs: 0 };
    out.push({ month: ym, label: MONTH_LABEL(ym), total: b.total, jobs: b.jobs });
  }
  return out;
}

/**
 * Share of vehicles seen inside their service window — the inverse of the
 * churn list, expressed as a percentage of the fleet.
 */
export function retentionRate(totalVehicles: number, churned: number): number {
  if (totalVehicles === 0) return 100;
  return Math.round(((totalVehicles - churned) / totalVehicles) * 100);
}
