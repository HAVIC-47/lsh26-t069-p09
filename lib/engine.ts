import { addDays, addMonths, daysBetween } from "./dates";
import { callPriority } from "./scoring";
import type {
  DueItem,
  Reading,
  ServiceItem,
  Status,
  Vehicle,
  WorkshopCase,
} from "./types";

/**
 * An item is "due soon" inside this many days. Stated here (and in the README)
 * so the three status bands are reproducible rather than a matter of taste.
 */
export const SOON_DAYS = 30;

/**
 * Standing assumption for a vehicle with nothing to measure yet — a private
 * car in Dhaka. Used only until a second odometer reading exists.
 */
export const DEFAULT_KM_PER_DAY = 25;

/**
 * How far this vehicle actually runs per day, measured from its own odometer
 * history — earliest reading to latest. Required by the problem: a fixed
 * interval applied to every vehicle does not score.
 *
 * Precondition: the vehicle has at least one odometer reading. `loadCase`
 * drops vehicles that have none, since an undated vehicle cannot be scheduled
 * at all, so this never sees an empty list.
 */
export function dailyRun(v: Vehicle) {
  const sorted = [...v.odometer_readings].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date)
  );
  const first: Reading = sorted[0];
  const last: Reading = sorted[sorted.length - 1];

  // One reading is a new arrival: there is no elapsed distance to divide yet,
  // so the workshop default stands in until the next reading is taken.
  if (sorted.length < 2) {
    return { rate: DEFAULT_KM_PER_DAY, first, last, span: 0, estimated: true };
  }

  const span = Math.max(1, daysBetween(first.date, last.date));
  const rate = Math.max(0.1, (last.km - first.km) / span);
  return { rate, first, last, span, estimated: false };
}

export const statusOf = (daysUntil: number): Status =>
  daysUntil < 0 ? "overdue" : daysUntil <= SOON_DAYS ? "due_soon" : "fine";

/**
 * Next due date for one item, using that item's own rule, plus the plain
 * sentence explaining how the date was reached for THIS vehicle.
 */
export function nextDue(item: ServiceItem, v: Vehicle) {
  const last = [...v.service_history]
    .filter((h) => h.item === item.name)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];

  if (item.rule === "fixed_date") {
    return {
      date: item.due_date!,
      basis: `Fixed expiry date — ${item.due_date}. Does not depend on use.`,
    };
  }

  if (item.rule === "period_months") {
    if (!last) {
      return { date: null, basis: "No service record yet — cannot date this item." };
    }
    return {
      date: addMonths(last.date, item.every_months!),
      basis: `Last done ${last.date}, due every ${item.every_months} months.`,
    };
  }

  // distance_km — estimate the date from this vehicle's own km/day
  if (!last || last.km == null) {
    return { date: null, basis: "No odometer-backed service record yet." };
  }
  const { rate, last: reading } = dailyRun(v);
  const dueOdo = last.km + item.every_km!;
  const kmLeft = dueOdo - reading.km;
  const days = Math.round(kmLeft / rate);

  // A vehicle can be past the distance mark already, in which case "-727 km
  // left" is the wrong sentence to put in front of a service adviser.
  const remaining =
    kmLeft >= 0
      ? `so ${kmLeft.toLocaleString()} km left`
      : `already ${Math.abs(kmLeft).toLocaleString()} km past it`;

  return {
    date: addDays(reading.date, days),
    basis:
      `Last done at ${last.km.toLocaleString()} km, due every ` +
      `${item.every_km!.toLocaleString()} km → due at ${dueOdo.toLocaleString()} km. ` +
      `Now ${reading.km.toLocaleString()} km, ${remaining} ` +
      `at ${rate.toFixed(1)} km/day.`,
  };
}

/**
 * Within-vehicle item ordering. Days overdue dominates; job value breaks ties.
 * Vehicle-level ranking on the call desk uses `callPriority` from scoring.ts,
 * which additionally weighs total pending value and how long it has been since
 * the customer was last contacted.
 */
export const urgencyOf = (daysUntil: number, cost: number) =>
  -daysUntil * 10 + cost / 1000;

/** Every item on every vehicle, dated, graded and scored. */
export function analyse(c: WorkshopCase): DueItem[] {
  const owners = new Map(c.owners.map((o) => [o.id, o]));
  const rows: DueItem[] = [];

  for (const v of c.vehicles) {
    // Belt and braces alongside the loadCase filter: a vehicle with no
    // odometer reading has nothing to date against.
    if (v.odometer_readings.length === 0) continue;

    const owner = owners.get(v.owner_id);
    for (const item of v.service_items) {
      const { date, basis } = nextDue(item, v);
      if (!date) continue;
      const daysUntil = daysBetween(c.today, date);
      const cost = parseFloat(item.cost_bdt);
      rows.push({
        vehicleId: v.id,
        plate: v.plate,
        model: v.model,
        ownerId: v.owner_id,
        ownerName: owner?.name ?? "Unknown",
        ownerPhone: owner?.phone ?? "",
        itemName: item.name,
        rule: item.rule,
        due: date,
        daysUntil,
        status: statusOf(daysUntil),
        basis,
        cost,
        urgency: urgencyOf(daysUntil, cost),
      });
    }
  }
  return rows;
}

export type CallListEntry = {
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  vehicleId: string;
  plate: string;
  model: string;
  items: DueItem[];
  priority: number;
  totalCost: number;
  worstDays: number;
  /** null when this customer has never been called. */
  lastCalledAt: string | null;
};

/**
 * One row per owner+vehicle that needs a call today, highest call priority
 * first. `lastCalledAt` maps vehicle id to the date of the most recent logged
 * call; an absent entry means never contacted, which scores as stale.
 */
export function buildCallList(
  rows: DueItem[],
  today: string,
  lastCalledAt: Map<string, string> = new Map()
): CallListEntry[] {
  const due = rows.filter((r) => r.status !== "fine");
  const byVehicle = new Map<string, CallListEntry>();

  for (const r of due) {
    let e = byVehicle.get(r.vehicleId);
    if (!e) {
      e = {
        ownerId: r.ownerId,
        ownerName: r.ownerName,
        ownerPhone: r.ownerPhone,
        vehicleId: r.vehicleId,
        plate: r.plate,
        model: r.model,
        items: [],
        priority: 0,
        totalCost: 0,
        worstDays: Infinity,
        lastCalledAt: lastCalledAt.get(r.vehicleId) ?? null,
      };
      byVehicle.set(r.vehicleId, e);
    }
    e.items.push(r);
    e.totalCost += r.cost;
    e.worstDays = Math.min(e.worstDays, r.daysUntil);
  }

  for (const e of byVehicle.values()) {
    e.items.sort((a, b) => b.urgency - a.urgency);
    e.priority = callPriority(e.items, e.lastCalledAt, today);
  }

  // Priority first; a stable tiebreak on lateness keeps the order reproducible.
  return [...byVehicle.values()].sort(
    (a, b) => b.priority - a.priority || a.worstDays - b.worstDays
  );
}
