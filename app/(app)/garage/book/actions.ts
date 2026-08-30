"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { loadCase } from "@/lib/data";
import { daysBetween } from "@/lib/dates";

export type BookingState = { ok: boolean; message: string } | null;

/**
 * Raises a service request against one of the customer's own vehicles.
 *
 * Written through the SESSION client rather than the admin one, so the
 * "customer raises requests" policy is a second check behind the permission
 * guard — a customer cannot book against a car that is not theirs even if this
 * code were wrong.
 */
export async function requestServiceAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  try {
    await requirePermission("requestAppointment");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not permitted." };
  }

  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const preferred = String(formData.get("preferred_date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!vehicleId || !preferred) {
    return { ok: false, message: "Pick a vehicle and a date." };
  }

  const workshop = await loadCase();
  if (!workshop.vehicles.some((v) => v.id === vehicleId)) {
    return { ok: false, message: "That vehicle is not on your account." };
  }
  if (daysBetween(workshop.today, preferred) < 0) {
    return { ok: false, message: "Pick a date that is not in the past." };
  }

  const supabase = await createSessionClient();
  if (!supabase) {
    return { ok: false, message: "Booking is unavailable — Supabase is not configured." };
  }

  const { error } = await supabase.from("service_requests").insert({
    vehicle_id: vehicleId,
    preferred_date: preferred,
    note,
  });

  if (error) {
    return {
      ok: false,
      message: error.message.includes("service_requests")
        ? "Booking is not set up yet — run supabase/migration-roles.sql."
        : error.message,
    };
  }

  revalidatePath("/garage/book");
  revalidatePath("/garage");
  return {
    ok: true,
    message: "Request sent. The workshop will confirm a time with you.",
  };
}
