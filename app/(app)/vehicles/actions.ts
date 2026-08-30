"use server";

import { revalidatePath } from "next/cache";
import { currentProfile, requirePermission } from "@/lib/auth";
import { addVehicle } from "@/lib/data";
import { DOCUMENTS } from "@/lib/catalogue";

export type AddVehicleState = { ok: boolean; message: string } | null;

/**
 * Registers a vehicle.
 *
 * Staff may register one for any owner; a customer may register only their own,
 * and the owner is taken from their profile rather than the form, so the field
 * cannot be tampered with.
 */
export async function addVehicleAction(
  _prev: AddVehicleState,
  formData: FormData
): Promise<AddVehicleState> {
  const profile = await currentProfile();
  if (!profile) return { ok: false, message: "Sign in to do this." };

  const isCustomer = profile.role === "customer";

  try {
    await requirePermission(isCustomer ? "addOwnVehicle" : "manageVehicles");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not permitted." };
  }

  const ownerId = isCustomer
    ? profile.owner_id
    : String(formData.get("owner_id") ?? "").trim();

  if (!ownerId) {
    return {
      ok: false,
      message: isCustomer
        ? "This account is not linked to a customer record yet."
        : "Choose which customer owns the vehicle.",
    };
  }

  const plate = String(formData.get("plate") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const odometer = Number(formData.get("odometer"));

  if (!plate) return { ok: false, message: "Enter the registration plate." };
  if (!model) return { ok: false, message: "Enter the make and model." };
  if (!Number.isFinite(odometer) || odometer < 0) {
    return { ok: false, message: "Enter the current odometer reading in kilometres." };
  }
  if (odometer > 2_000_000) {
    return { ok: false, message: "That odometer reading looks wrong — check the digits." };
  }

  // A document is tracked only when a real expiry is supplied; an expiry date
  // cannot be guessed, so a blank field means "not tracked yet".
  const documents = DOCUMENTS.map((d) => {
    const due = String(formData.get(`doc_${d.key}`) ?? "").trim();
    return due ? { name: d.name, due_date: due, cost_bdt: d.cost_bdt } : null;
  }).filter((d): d is { name: string; due_date: string; cost_bdt: string } => d !== null);

  let id: string;
  try {
    id = await addVehicle({ ownerId, plate, model, odometer, documents });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not add the vehicle." };
  }

  revalidatePath("/vehicles");
  revalidatePath("/garage");
  revalidatePath("/garage/profile");
  revalidatePath("/desk");
  revalidatePath("/bay");

  return {
    ok: true,
    message:
      `${plate} added as ${id}. It now carries the standard service catalogue, ` +
      `dated from today, and is visible to the workshop.`,
  };
}
