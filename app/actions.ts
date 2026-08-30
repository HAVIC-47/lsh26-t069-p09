"use server";

import { revalidatePath } from "next/cache";
import { addReading, loadCase, recordService } from "@/lib/data";
import { dailyRun } from "@/lib/engine";
import { odometerAnomaly } from "@/lib/scoring";
import { requirePermission } from "@/lib/auth";

export type ActionState = {
  ok: boolean;
  message: string;
  /** Set when the write is plausible-but-odd and the user may override. */
  needsConfirm?: boolean;
} | null;

/**
 * Marks one item as serviced today. Only that item's history gains a row, so
 * only that item's next-due date moves — every other item is untouched.
 */
export async function recordServiceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  // The service-role client ignores RLS, so this check — not the database
  // policy — is what actually stops an unauthorised write.
  try {
    await requirePermission("recordService");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not permitted." };
  }

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const itemName = String(formData.get("itemName") ?? "");
  const rule = String(formData.get("rule") ?? "");

  if (!vehicleId || !itemName) {
    return { ok: false, message: "Missing vehicle or item." };
  }

  const workshop = await loadCase();
  const vehicle = workshop.vehicles.find((v) => v.id === vehicleId);
  const item = vehicle?.service_items.find((i) => i.name === itemName);

  if (!vehicle || !item) {
    return { ok: false, message: "That item is no longer on this vehicle." };
  }

  // Time-based services take no odometer reading; distance-based ones are
  // stamped with the vehicle's current reading so the next interval counts
  // from where it actually was serviced.
  const km = rule === "distance_km" ? dailyRun(vehicle).last.km : null;

  try {
    await recordService({
      vehicleId,
      itemName,
      date: workshop.today,
      km,
      cost: parseFloat(item.cost_bdt),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not save." };
  }

  revalidatePath("/desk");
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true, message: `${itemName} recorded as done today.` };
}

/** Adds an odometer reading; every distance estimate re-derives from it. */
export async function addReadingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requirePermission("recordOdometer");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not permitted." };
  }

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const km = Number(formData.get("km"));
  const confirmed = formData.get("confirmAnomaly") === "yes";

  const workshop = await loadCase();
  const vehicle = workshop.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return { ok: false, message: "Vehicle not found." };

  if (!Number.isFinite(km) || km <= 0) {
    return { ok: false, message: "Enter the odometer reading in kilometres." };
  }

  // A bad reading corrupts every distance estimate on this vehicle, so an
  // implausible one is questioned once rather than silently accepted.
  const anomaly = odometerAnomaly(vehicle, km, workshop.today);
  if (anomaly && !(confirmed && anomaly.kind === "jump")) {
    return {
      ok: false,
      message: anomaly.message,
      needsConfirm: anomaly.kind === "jump",
    };
  }

  try {
    await addReading(vehicleId, workshop.today, km);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not save." };
  }

  revalidatePath("/desk");
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true, message: `Odometer updated to ${km.toLocaleString()} km.` };
}
