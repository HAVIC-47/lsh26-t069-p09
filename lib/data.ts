import "server-only";
import { cache } from "react";
import raw from "../data/P09_vehicle_service_public.json";
import { createSessionClient } from "./supabase/server";
import { hasAuth } from "./supabase/config";
import type { HistoryRow, InspectionFlags, WorkshopCase } from "./types";

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

  const inspectionFlags = await latestInspectionFlags(supabase, history.data ?? []);

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
      inspection: inspectionFlags.get(v.id),
    })),
  });
});

/**
 * The most recent inspection per vehicle, expressed as counts — but only when
 * no service has been recorded since. A visit is taken to have addressed what
 * the inspection raised, so the health penalty lifts once work is done rather
 * than hanging over the vehicle forever.
 *
 * Returns an empty map if the inspections tables are not present, so a database
 * without the role migration still loads.
 */
async function latestInspectionFlags(
  supabase: NonNullable<Awaited<ReturnType<typeof createSessionClient>>>,
  history: { vehicle_id: string; date: string }[]
): Promise<Map<string, InspectionFlags>> {
  const out = new Map<string, InspectionFlags>();

  const { data: inspections, error } = await supabase
    .from("inspections")
    .select("id, vehicle_id, created_at")
    .order("created_at", { ascending: false });

  if (error || !inspections || inspections.length === 0) return out;

  // Keep only the newest inspection per vehicle.
  const newest = new Map<string, { id: number; date: string }>();
  for (const i of inspections) {
    if (!newest.has(i.vehicle_id)) {
      newest.set(i.vehicle_id, { id: i.id, date: String(i.created_at).slice(0, 10) });
    }
  }

  const lastService = new Map<string, string>();
  for (const h of history) {
    const prev = lastService.get(h.vehicle_id);
    if (!prev || h.date > prev) lastService.set(h.vehicle_id, h.date);
  }

  const live = [...newest.entries()].filter(([vehicleId, insp]) => {
    const serviced = lastService.get(vehicleId);
    return !serviced || insp.date > serviced;
  });
  if (live.length === 0) return out;

  const { data: points } = await supabase
    .from("inspection_items")
    .select("inspection_id, verdict")
    .in("inspection_id", live.map(([, i]) => i.id));

  for (const [vehicleId, insp] of live) {
    const mine = (points ?? []).filter((p) => p.inspection_id === insp.id);
    const attention = mine.filter((p) => p.verdict === "attention").length;
    const fail = mine.filter((p) => p.verdict === "fail").length;
    if (attention || fail) out.set(vehicleId, { attention, fail, date: insp.date });
  }

  return out;
}

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

/* --------------------------------------------------- recording a service */

export type ServiceJob = {
  vehicleId: string;
  /** Only these items reset; anything the customer declined keeps its status. */
  itemNames: string[];
  technicianId: string | null;
  odometer: number | null;
  note: string | null;
};

/**
 * Records one visit covering several items.
 *
 * Writes a job header plus one service_history row per item selected, which is
 * what the dating engine reads — so exactly the chosen items reset and nothing
 * else moves. Recording a service also lifts any inspection penalty on the
 * vehicle, because the visit is taken to have addressed what was raised.
 */
export async function recordServiceJob(input: ServiceJob): Promise<number> {
  const { admin, hasSupabase } = await import("./supabase/admin");
  if (!hasSupabase || !admin) {
    throw new Error("Recording a service needs Supabase; this deployment has none.");
  }
  if (input.itemNames.length === 0) {
    throw new Error("Select at least one item that was serviced.");
  }

  const [{ data: cfg }, { data: items }] = await Promise.all([
    admin.from("app_config").select("today").eq("id", 1).single(),
    admin
      .from("service_items")
      .select("name, rule, cost_bdt")
      .eq("vehicle_id", input.vehicleId),
  ]);

  const today: string = cfg?.today ?? new Date().toISOString().slice(0, 10);
  const byName = new Map((items ?? []).map((i) => [i.name, i]));

  const chosen = input.itemNames.filter((n) => byName.has(n));
  if (chosen.length === 0) {
    throw new Error("None of those items are on this vehicle.");
  }

  const total = chosen.reduce(
    (n, name) => n + parseFloat(String(byName.get(name)!.cost_bdt)),
    0
  );

  const { data: job, error: jErr } = await admin
    .from("service_jobs")
    .insert({
      vehicle_id: input.vehicleId,
      date: today,
      odometer: input.odometer,
      technician_id: input.technicianId,
      note: input.note,
      total_bdt: total,
    })
    .select("id")
    .single();

  if (jErr || !job) {
    throw new Error(`Could not open the job sheet: ${jErr?.message ?? "unknown error"}`);
  }

  const { error: hErr } = await admin.from("service_history").insert(
    chosen.map((name) => {
      const item = byName.get(name)!;
      return {
        vehicle_id: input.vehicleId,
        item_name: name,
        date: today,
        // A time-based item takes no odometer; only distance items need one.
        km: item.rule === "distance_km" ? input.odometer : null,
        cost_bdt: item.cost_bdt,
        job_id: job.id,
      };
    })
  );

  if (hErr) {
    // Never leave a job header with no items behind it.
    await admin.from("service_jobs").delete().eq("id", job.id);
    throw new Error(`Could not record the work: ${hErr.message}`);
  }

  if (input.odometer != null) {
    await admin
      .from("odometer_readings")
      .upsert(
        { vehicle_id: input.vehicleId, date: today, km: input.odometer },
        { onConflict: "vehicle_id,date" }
      );
  }

  return job.id;
}
