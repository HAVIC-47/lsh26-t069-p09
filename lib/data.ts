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

/* ------------------------------------------------------ adding a vehicle */

export type NewVehicle = {
  ownerId: string;
  plate: string;
  model: string;
  odometer: number;
  /** Optional expiry dates; a document is only tracked when one is given. */
  documents?: { name: string; due_date: string; cost_bdt: string }[];
};

/**
 * Registers a vehicle and everything it needs to be schedulable from day one:
 * an opening odometer reading, the standard catalogue items, and a service
 * history row per item dated today.
 *
 * The history rows matter — without a "last done" a time or distance item
 * cannot be dated at all, and the vehicle would sit on the register showing
 * nothing. Dating it from today is the honest reading: the workshop starts
 * tracking it now.
 *
 * Uses the admin client because the caller may be a customer registering their
 * own car, and customers are deliberately not granted insert rights on the
 * workshop tables. The permission and ownership checks in the server action run
 * first — see app/(app)/vehicles/actions.ts.
 */
export async function addVehicle(input: NewVehicle): Promise<string> {
  const { admin, hasSupabase } = await import("./supabase/admin");
  if (!hasSupabase || !admin) {
    throw new Error("Adding a vehicle needs Supabase; this deployment has none.");
  }

  const { CATALOGUE } = await import("./catalogue");

  const [{ data: cfg }, { data: existing }] = await Promise.all([
    admin.from("app_config").select("today").eq("id", 1).single(),
    admin.from("vehicles").select("id, plate"),
  ]);

  const today: string = cfg?.today ?? new Date().toISOString().slice(0, 10);
  const plate = input.plate.trim();

  if ((existing ?? []).some((v) => v.plate.toLowerCase() === plate.toLowerCase())) {
    throw new Error(`${plate} is already on the register.`);
  }

  // Ids follow the dataset's V01… form, continuing from the highest in use.
  const highest = (existing ?? []).reduce((max, v) => {
    const n = Number(String(v.id).replace(/\D/g, ""));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  const id = `V${String(highest + 1).padStart(2, "0")}`;

  const { error: vErr } = await admin.from("vehicles").insert({
    id,
    owner_id: input.ownerId,
    model: input.model.trim(),
    plate,
  });
  if (vErr) throw new Error(`Could not add the vehicle: ${vErr.message}`);

  const cleanup = async (msg: string) => {
    await admin.from("vehicles").delete().eq("id", id);
    throw new Error(msg);
  };

  const { error: oErr } = await admin
    .from("odometer_readings")
    .insert({ vehicle_id: id, date: today, km: input.odometer });
  if (oErr) await cleanup(`Could not save the odometer reading: ${oErr.message}`);

  const items = [
    ...CATALOGUE.map((c) => ({
      vehicle_id: id,
      name: c.name,
      rule: c.rule,
      due_date: null,
      every_months: c.every_months ?? null,
      every_km: c.every_km ?? null,
      cost_bdt: c.cost_bdt,
    })),
    ...(input.documents ?? []).map((d) => ({
      vehicle_id: id,
      name: d.name,
      rule: "fixed_date" as const,
      due_date: d.due_date,
      every_months: null,
      every_km: null,
      cost_bdt: d.cost_bdt,
    })),
  ];
  const { error: iErr } = await admin.from("service_items").insert(items);
  if (iErr) await cleanup(`Could not add the service items: ${iErr.message}`);

  // Only the interval items need a starting point; a document carries its own
  // expiry and has no "last done".
  const history = CATALOGUE.map((c) => ({
    vehicle_id: id,
    item_name: c.name,
    date: today,
    km: c.rule === "distance_km" ? input.odometer : null,
    cost_bdt: "0.00",
  }));
  const { error: hErr } = await admin.from("service_history").insert(history);
  if (hErr) await cleanup(`Could not start the service history: ${hErr.message}`);

  return id;
}
