"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { loadCase } from "@/lib/data";
import { ALL_POINTS, type Verdict } from "@/lib/inspection";

export type InspectionState = { ok: boolean; message: string } | null;

const VERDICTS: Verdict[] = ["pass", "attention", "fail"];

/**
 * Saves one completed inspection: a header row plus one row per point.
 *
 * Written through the session client so the "staff record inspections" policy
 * applies on top of the permission guard. Points marked attention or fail are
 * what the manager needs to see, so they are counted back in the result.
 */
export async function saveInspectionAction(
  _prev: InspectionState,
  formData: FormData
): Promise<InspectionState> {
  let me;
  try {
    me = await requirePermission("submitInspection");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not permitted." };
  }

  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!vehicleId) return { ok: false, message: "Pick a vehicle." };

  const workshop = await loadCase();
  const vehicle = workshop.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return { ok: false, message: "That vehicle is not on the register." };

  const odoRaw = formData.get("odometer");
  const odometer = odoRaw != null && String(odoRaw).trim() !== "" ? Number(odoRaw) : null;
  if (odometer != null && (!Number.isFinite(odometer) || odometer < 0)) {
    return { ok: false, message: "Odometer must be a positive number." };
  }

  const items = ALL_POINTS.map((point) => {
    const raw = String(formData.get(`p:${point}`) ?? "pass") as Verdict;
    return { point, verdict: VERDICTS.includes(raw) ? raw : "pass" };
  });

  const supabase = await createSessionClient();
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured for this deployment." };
  }

  const { data: header, error: hErr } = await supabase
    .from("inspections")
    .insert({
      vehicle_id: vehicleId,
      technician_id: me.id,
      odometer,
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (hErr || !header) {
    return {
      ok: false,
      message: hErr?.message.includes("inspections")
        ? "Inspections are not set up yet — run supabase/migration-roles.sql."
        : (hErr?.message ?? "Could not save the inspection."),
    };
  }

  const { error: iErr } = await supabase.from("inspection_items").insert(
    items.map((i) => ({
      inspection_id: header.id,
      point: i.point,
      verdict: i.verdict,
    }))
  );

  if (iErr) {
    // Do not leave a header with no points behind it.
    await supabase.from("inspections").delete().eq("id", header.id);
    return { ok: false, message: `Could not save the points: ${iErr.message}` };
  }

  const flagged = items.filter((i) => i.verdict !== "pass").length;

  revalidatePath("/bay/inspect");
  revalidatePath("/bay");
  return {
    ok: true,
    message: flagged
      ? `Saved. ${flagged} point${flagged === 1 ? "" : "s"} flagged for the manager.`
      : "Saved. Everything passed.",
  };
}
