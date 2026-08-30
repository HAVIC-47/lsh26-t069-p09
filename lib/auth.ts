import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient, hasAuth } from "./supabase/server";
import type { Role } from "./types";
import {
  MATRIX,
  PUBLISHED_MATRIX,
  ACCESS_LABEL,
  accessFor,
  allows,
  rolesAllowed,
  type Access,
  type Permission,
} from "./permissions";

export type { Role };

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  owner_id: string | null;
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Workshop Admin",
  manager: "Workshop Manager",
  technician: "Service Technician",
  customer: "Vehicle Owner",
};

/**
 * Where each role starts. There is no shared dashboard: an admin opens the
 * executive view, a manager the call desk, a technician the bay queue, and a
 * customer their own garage.
 */
export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  manager: "/desk",
  technician: "/bay",
  customer: "/garage",
};

/**
 * The permission model lives in lib/permissions.ts as a matrix, so the table
 * shown on /admin/users is rendered from the same data the guards read and
 * cannot drift from what is enforced.
 */
export {
  MATRIX,
  PUBLISHED_MATRIX,
  ACCESS_LABEL,
  accessFor,
  allows,
  rolesAllowed,
  type Access,
  type Permission,
};

const WRITES = new Set<Permission>([
  "manageStaff",
  "editCatalogue",
  "manageVehicles",
  "sendReminders",
  "updateOdometer",
  "recordService",
  "submitInspection",
  "requestAppointment",
  "editOwnProfile",
]);

/**
 * Stand-in identity for a checkout with no Supabase configured, so
 * `npm install && npm run dev` still opens a working app instead of an
 * unescapable login page. It exists only when there is no auth backend at all;
 * any deployment with credentials enforces real sign-in. Noted in the README.
 */
const LOCAL_DEV_PROFILE: Profile = {
  id: "local-dev",
  full_name: "Local Development",
  role: "admin",
  owner_id: null,
};

/** The signed-in user's profile, or null when nobody is signed in. */
export const currentProfile = cache(async (): Promise<Profile | null> => {
  if (!hasAuth) return LOCAL_DEV_PROFILE;

  const supabase = await createSessionClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, owner_id")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
});

/** Non-throwing check for conditional rendering. */
export async function can(action: Permission): Promise<boolean> {
  const profile = await currentProfile();
  return profile ? allows(profile.role, action) : false;
}

/** The scope, not just yes/no — "own" means own vehicles only. */
export async function scopeFor(action: Permission): Promise<Access> {
  const profile = await currentProfile();
  return profile ? accessFor(profile.role, action) : "none";
}

export const roleCan = (role: Role, action: Permission) => allows(role, action);

/**
 * Page guard. Sends a signed-out visitor to the login page, and a signed-in
 * user who lacks the permission back to their own home rather than showing
 * them a wall — a technician who lands on /admin belongs on /bay.
 */
export async function requireRole(action: Permission): Promise<Profile> {
  const profile = await currentProfile();
  if (!profile) redirect("/login");
  if (!allows(profile.role, action)) redirect(ROLE_HOME[profile.role]);
  return profile;
}

/** Page guard for anything that only needs a signed-in user. */
export async function requireUser(): Promise<Profile> {
  const profile = await currentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/**
 * Guard for server actions. Writes use the service-role client, which bypasses
 * row-level security by design, so this check — not the database policy — is
 * what actually stops an unauthorised write. It throws rather than redirects,
 * so the action can return the reason to the form.
 */
export async function requirePermission(action: Permission): Promise<Profile> {
  const profile = await currentProfile();

  if (!profile) throw new Error("Sign in to do this.");

  if (!allows(profile.role, action)) {
    const allowed = rolesAllowed(action).map((r) => ROLE_LABEL[r]).join(" or ");
    throw new Error(
      `${ROLE_LABEL[profile.role]} cannot do this.` +
        (allowed ? ` Required: ${allowed}.` : "")
    );
  }
  return profile;
}

export const isWrite = (action: Permission) => WRITES.has(action);
