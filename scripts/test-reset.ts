/**
 * Guards the stated constraint: recording a completed service must reset
 * that ONE item and leave every other item on the vehicle untouched.
 */
import raw from "../data/P09_vehicle_service_public.json";
import { analyse, dailyRun } from "../lib/engine";
import type { WorkshopCase } from "../lib/types";

const base = (raw as { cases: WorkshopCase[] }).cases[0];
let failures = 0;

const snapshot = (c: WorkshopCase) =>
  new Map(analyse(c).map((r) => [`${r.vehicleId}::${r.itemName}`, r.due]));

const before = snapshot(base);

// Service one item on each of the first 12 vehicles, one at a time.
for (const v of base.vehicles.slice(0, 12)) {
  for (const item of v.service_items) {
    if (item.rule === "fixed_date") continue; // no history clock to reset

    const km = item.rule === "distance_km" ? dailyRun(v).last.km : null;
    const mutated: WorkshopCase = {
      ...base,
      vehicles: base.vehicles.map((x) =>
        x.id !== v.id
          ? x
          : {
              ...x,
              service_history: [
                ...x.service_history,
                { item: item.name, date: base.today, km, cost_bdt: item.cost_bdt },
              ],
            }
      ),
    };

    const after = snapshot(mutated);
    const key = `${v.id}::${item.name}`;

    if (after.get(key) === before.get(key)) {
      console.error(`✗ ${key} did NOT move after being serviced`);
      failures++;
    }

    for (const [k, due] of before) {
      if (k !== key && after.get(k) !== due) {
        console.error(`✗ servicing ${key} also moved ${k}: ${due} -> ${after.get(k)}`);
        failures++;
      }
    }
  }
}

const distanceMoved = (() => {
  const v = base.vehicles.find((x) =>
    x.service_items.some((i) => i.rule === "distance_km")
  )!;
  const bumped: WorkshopCase = {
    ...base,
    vehicles: base.vehicles.map((x) =>
      x.id !== v.id
        ? x
        : {
            ...x,
            odometer_readings: [
              ...x.odometer_readings,
              { date: base.today, km: dailyRun(x).last.km + 5000 },
            ],
          }
    ),
  };
  const a = snapshot(base);
  const b = snapshot(bumped);
  const distKeys = v.service_items
    .filter((i) => i.rule === "distance_km")
    .map((i) => `${v.id}::${i.name}`);
  return distKeys.every((k) => a.get(k) !== b.get(k));
})();

if (!distanceMoved) {
  console.error("✗ a new odometer reading did not move distance-based estimates");
  failures++;
}

console.log(
  failures === 0
    ? `✓ reset isolation holds across ${before.size} items; odometer updates propagate`
    : `✗ ${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
