import "server-only";
import { cache } from "react";
import { createSessionClient, hasAuth } from "./supabase/server";

export type Role = "admin" | "manager" | "technician" | "customer";

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
 * Permission table. Kept as data rather than scattered `if` statements so the
 * rules can be shown in the UI and checked in one place.
 */
export const CAN: Record<string, Role[]> = {
  viewCallDesk: ["admin", "manager"],
  viewAnalytics: ["admin", "manager"],
  viewDocuments: ["admin", "manager"],
  viewAllVehicles: ["admin", "manager", "technician"],
  recordService: ["admin", "manager"],
  recordOdometer: ["admin", "manager", "technician"],
  logCall: ["admin", "manager"],
  editCatalogue: ["admin"],
  manageStaff: ["admin"],
};

/** The signed-in user's profile, or null when nobody is signed in. */
export const currentProfile = cache(async (): Promise<Profile | null> => {
  if (!hasAuth) return null;

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

/**
 * Whether the current visitor may do `action`.
 *
 * With no Supabase auth configured the app runs in signed-out demo mode: every
 * read is allowed so the deployed URL is usable without credentials, and every
 * write is refused so nobody can mutate a public demo.
 */
export async function can(action: keyof typeof CAN): Promise<boolean> {
  const profile = await currentProfile();
  if (!profile) return !isWrite(action);
  return CAN[action].includes(profile.role);
}

const WRITES = new Set([
  "recordService",
  "recordOdometer",
  "logCall",
  "editCatalogue",
  "manageStaff",
]);

export const isWrite = (action: string) => WRITES.has(action);

/**
 * Guard for server actions. The service-role client ignores RLS, so this check
 * — not the database policy — is what actually stops an unauthorised write.
 * Every mutating action must call it before touching `admin`.
 */
export async function requirePermission(action: keyof typeof CAN) {
  const profile = await currentProfile();

  if (!profile) {
    throw new Error(
      "This demo is running signed out and is read-only. Sign in as a workshop manager to record work."
    );
  }
  if (!CAN[action].includes(profile.role)) {
    throw new Error(
      `${ROLE_LABEL[profile.role]} cannot do this. Required: ${CAN[action]
        .map((r) => ROLE_LABEL[r])
        .join(" or ")}.`
    );
  }
  return profile;
}
