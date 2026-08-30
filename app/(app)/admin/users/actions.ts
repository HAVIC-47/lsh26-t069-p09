"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, type Role } from "@/lib/auth";
import { admin, hasSupabase } from "@/lib/supabase/admin";

export type UserActionState = { ok: boolean; message: string } | null;

const STAFF_ROLES: Role[] = ["admin", "manager", "technician"];

/**
 * Creates a staff account. Customers are never created here — they claim their
 * own account through sign-up, which links them to an owner on the register.
 */
export async function inviteStaffAction(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  try {
    await requirePermission("manageStaff");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not permitted." };
  }

  if (!hasSupabase || !admin) {
    return { ok: false, message: "Supabase is not configured for this deployment." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const password = String(formData.get("password") ?? "");

  if (!email || !fullName || !password) {
    return { ok: false, message: "Fill in every field." };
  }
  if (!STAFF_ROLES.includes(role)) {
    return { ok: false, message: "Pick a staff role." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Use a password of at least 8 characters." };
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    return { ok: false, message: error?.message ?? "Could not create the account." };
  }

  const { error: pErr } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    role,
    owner_id: null,
  });
  if (pErr) {
    // Never leave an auth user with no profile — they would sign in to nothing.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: `Could not set up the profile: ${pErr.message}` };
  }

  revalidatePath("/admin/users");
  return { ok: true, message: `${fullName} can now sign in as ${role}.` };
}

/** Revokes access. The workshop data the person touched is untouched. */
export async function revokeUserAction(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  let me;
  try {
    me = await requirePermission("manageStaff");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not permitted." };
  }

  if (!hasSupabase || !admin) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "No account named." };
  if (id === me.id) {
    return { ok: false, message: "You cannot revoke your own access." };
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/users");
  return { ok: true, message: "Access revoked." };
}
