"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { loadCase, recordServiceJob } from "@/lib/data";
import { odometerAnomaly } from "@/lib/scoring";

export type ServiceJobState = {
  ok: boolean;
  message: string;
  /** Set when the odometer looks odd but the user may override. */
  needsConfirm?: boolean;
} | null;

export async function saveServiceJobAction(
  _prev: ServiceJobState,
  formData: FormData
): Promise<ServiceJobState> {
  let me;
  try {
    me = await requirePermission("recordService");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not permitted." };
  }

  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const itemNames = formData.getAll("items").map(String).filter(Boolean);
  const raised = formData.getAll("inspection_points").map(String).filter(Boolean);
  const typed = String(formData.get("note") ?? "").trim();
  const confirmed = formData.get("confirmAnomaly") === "yes";

  if (!vehicleId) return { ok: false, message: "Pick a vehicle." };
  if (itemNames.length === 0 && raised.length === 0) {
    return { ok: false, message: "Tick the items that were actually serviced." };
  }

  // Inspection findings are not catalogue items, so they cannot reset an
  // interval. They are recorded on the job sheet instead, which is what a
  // later reader needs — and the service itself clears the health penalty.
  const note =
    [
      typed,
      raised.length ? `Inspection findings addressed: ${raised.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ") || null;

  const workshop = await loadCase();
  const vehicle = workshop.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return { ok: false, message: "That vehicle is not on the register." };

  const raw = formData.get("odometer");
  const odometer =
    raw != null && String(raw).trim() !== "" ? Number(raw) : null;

  if (odometer != null) {
    if (!Number.isFinite(odometer) || odometer < 0) {
      return { ok: false, message: "Enter the odometer reading in kilometres." };
    }
    // The same guard the intake form uses — a bad reading here would corrupt
    // every distance estimate on the vehicle from this point on.
    const anomaly = odometerAnomaly(vehicle, odometer, workshop.today);
    if (anomaly && !(confirmed && anomaly.kind === "jump")) {
      return {
        ok: false,
        message: anomaly.message,
        needsConfirm: anomaly.kind === "jump",
      };
    }
  }

  try {
    await recordServiceJob({
      vehicleId,
      itemNames,
      technicianId: me.id,
      odometer,
      note,
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not save." };
  }

  // Health, the call desk and the customer's garage all move on this.
  revalidatePath("/bay");
  revalidatePath("/bay/service");
  revalidatePath("/desk");
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);

  const n = itemNames.length;
  const parts: string[] = [];
  if (n) {
    parts.push(
      `${n} item${n === 1 ? "" : "s"} recorded as done — ` +
        `${n === 1 ? "its" : "their"} next due date has moved and the service ` +
        `history is updated.`
    );
  }
  if (raised.length) {
    parts.push(
      `${raised.length} inspection finding${raised.length === 1 ? "" : "s"} ` +
        `noted on the job sheet, and the health penalty from that inspection is cleared.`
    );
  }
  parts.push("Anything left unticked keeps its current status.");

  return { ok: true, message: parts.join(" ") };
}
