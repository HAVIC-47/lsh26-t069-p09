import "server-only";
import { cache } from "react";
import raw from "../data/P09_vehicle_service_public.json";
import { createSessionClient } from "./supabase/server";
import { hasAuth } from "./supabase/config";
import type { HistoryRow, WorkshopCase } from "./types";

const SEED = (raw as { cases: WorkshopCase[] }).cases[0];

/**
 * Fallback store used when Supabase is not configured, so the app still runs
 * end to end from a clean checkout. Writes live in process memory only — the
 * Supabase path is the persistent one.
 */
const memory = {
  history: [] as (HistoryRow & { vehicle_id: string })[],
  readings: [] as { vehicle_id: string; date: string; km: number }[],
};

/**
 * A vehicle with no odometer reading cannot be dated or scheduled, so it is
 * dropped here rather than left to produce NaN downstream. This is the single
 * choke point that lets `dailyRun` assume at least one reading exists.
 */
function datable(c: WorkshopCase): WorkshopCase {
  return { ...c, vehicles: c.vehicles.filter((v) => v.odometer_readings.length > 0) };
}

function buildFromMemory(): WorkshopCase {
  return datable({
    ...SEED,
    vehicles: SEED.vehicles.map((v) => ({
      ...v,
      odometer_readings: [
        ...v.odometer_readings,
        ...memory.readings.filter((r) => r.vehicle_id === v.id),
      ],
      service_history: [
        ...v.service_history,
        ...memory.history
          .filter((h) => h.vehicle_id === v.id)
          .map(({ vehicle_id: _v, ...h }) => h),
      ],
    })),
  });
}

/**
 * The whole workshop, assembled into the shape the engine consumes.
 *
 * Reads go through the SESSION client, never the service-role one, so
 * row-level security actually applies: a signed-in customer sees only their
 * own vehicles, and a signed-out visitor sees the read-only demo via the
 * `anon` policies. Wrapped in cache() so the layout and the page share one
 * round trip per request.
 */
export const loadCase = cache(async function loadCase(): Promise<WorkshopCase> {
  if (!hasAuth) return buildFromMemory();
  const supabase = await createSessionClient();
  if (!supabase) return buildFromMemory();

  const [cfg, owners, vehicles, readings, items, history] = await Promise.all([
    supabase.from("app_config").select("*").single(),
    supabase.from("owners").select("*").order("name"),
    supabase.from("vehicles").select("*"),
    supabase.from("odometer_readings").select("*"),
    supabase.from("service_items").select("*"),
    supabase.from("service_history").select("*"),
  ]);

  const err = [cfg, owners, vehicles, readings, items, history].find((r) => r.error);
  if (err?.error) throw new Error(`Supabase read failed: ${err.error.message}`);

  const byVehicle = <T extends { vehicle_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.vehicle_id, [...(m.get(r.vehicle_id) ?? []), r]);
    return m;
  };

  const readingMap = byVehicle(readings.data ?? []);
  const itemMap = byVehicle(items.data ?? []);
  const historyMap = byVehicle(history.data ?? []);

  return datable({
    case_id: cfg.data!.case_id,
    today: cfg.data!.today,
    owners: owners.data ?? [],
    vehicles: (vehicles.data ?? []).map((v) => ({
      id: v.id,
      owner_id: v.owner_id,
      model: v.model,
      plate: v.plate,
      odometer_readings: (readingMap.get(v.id) ?? []).map((r) => ({
        date: r.date,
        km: r.km,
      })),
      service_items: (itemMap.get(v.id) ?? []).map((i) => ({
        name: i.name,
        rule: i.rule,
        due_date: i.due_date ?? undefined,
        every_months: i.every_months ?? undefined,
        every_km: i.every_km ?? undefined,
        cost_bdt: String(i.cost_bdt),
      })),
      service_history: (historyMap.get(v.id) ?? []).map((h) => ({
        item: h.item_name,
        date: h.date,
        km: h.km,
        cost_bdt: String(h.cost_bdt),
      })),
    })),
  });
});

/**
 * Records one completed service. Appending a history row resets exactly that
 * item's clock and nothing else — no other item on the vehicle is touched.
 */
export async function recordService(input: {
  vehicleId: string;
  itemName: string;
  date: string;
  km: number | null;
  cost: number;
}) {
  const row = {
    vehicle_id: input.vehicleId,
    item_name: input.itemName,
    date: input.date,
    km: input.km,
    cost_bdt: input.cost,
  };

  const supabase = hasAuth ? await createSessionClient() : null;
  if (!supabase) {
    memory.history.push({
      vehicle_id: input.vehicleId,
      item: input.itemName,
      date: input.date,
      km: input.km,
      cost_bdt: String(input.cost),
    });
    return;
  }

  const { error } = await supabase.from("service_history").insert(row);
  if (error) throw new Error(`Could not record service: ${error.message}`);
}

/** Adds an odometer reading; every distance-based estimate re-derives from it. */
export async function addReading(vehicleId: string, date: string, km: number) {
  const supabase = hasAuth ? await createSessionClient() : null;
  if (!supabase) {
    memory.readings = memory.readings.filter(
      (r) => !(r.vehicle_id === vehicleId && r.date === date)
    );
    memory.readings.push({ vehicle_id: vehicleId, date, km });
    return;
  }

  const { error } = await supabase
    .from("odometer_readings")
    .upsert({ vehicle_id: vehicleId, date, km }, { onConflict: "vehicle_id,date" });
  if (error) throw new Error(`Could not save reading: ${error.message}`);
}
