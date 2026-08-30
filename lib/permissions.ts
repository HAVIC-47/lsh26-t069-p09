import type { Role } from "./types";

/**
 * Three access levels, not two. "own" is what the roles matrix calls
 * "Own vehicles only" — a customer genuinely can view service history, but
 * only for vehicles belonging to them, which row-level security enforces.
 */
export type Access = "full" | "own" | "none";

export type Permission =
  // --- the fourteen actions from the roles and permissions matrix ---
  | "manageStaff"
  | "editCatalogue"
  | "viewFinancials"
  | "viewCallDesk"
  | "manageVehicles"
  | "sendReminders"
  | "updateOdometer"
  | "recordService"
  | "submitInspection"
  | "viewServiceHistory"
  | "viewHealthAndDue"
  | "downloadInvoice"
  | "requestAppointment"
  | "editOwnProfile"
  // --- internal route guards, derived from the above ---
  | "addOwnVehicle"
  | "viewExecutive"
  | "viewBayQueue"
  | "viewOwnGarage"
  | "viewMoney";

const F: Access = "full";
const N: Access = "none";
const O: Access = "own";

/**
 * The canonical matrix. This array is the single source of truth: the guards
 * read it, and the table on /admin/users renders straight from it, so the
 * documented rules and the enforced rules cannot drift apart.
 *
 * Order and wording follow the roles and permissions matrix exactly.
 */
export const MATRIX: {
  key: Permission;
  label: string;
  /** False for the internal guards, which are not part of the published matrix. */
  published: boolean;
  access: Record<Role, Access>;
}[] = [
  {
    key: "manageStaff",
    label: "Manage staff accounts & roles",
    published: true,
    access: { admin: F, manager: N, technician: N, customer: N },
  },
  {
    key: "editCatalogue",
    label: "Edit global service catalog & pricing",
    published: true,
    access: { admin: F, manager: N, technician: N, customer: N },
  },
  {
    key: "viewFinancials",
    label: "View financial & revenue forecasts",
    published: true,
    access: { admin: F, manager: F, technician: N, customer: N },
  },
  {
    key: "viewCallDesk",
    label: "Access Daily Call Priority Desk",
    published: true,
    access: { admin: F, manager: F, technician: N, customer: N },
  },
  {
    key: "manageVehicles",
    label: "Add / edit / delete vehicle records",
    published: true,
    access: { admin: F, manager: F, technician: N, customer: N },
  },
  {
    key: "sendReminders",
    label: "Send automated customer reminders",
    published: true,
    access: { admin: F, manager: F, technician: N, customer: N },
  },
  {
    key: "updateOdometer",
    label: "Update odometer readings",
    published: true,
    access: { admin: F, manager: F, technician: F, customer: N },
  },
  {
    // DEPARTS FROM THE PUBLISHED MATRIX: the roles PDF gives this to Admin and
    // Manager only. Technicians were granted it so the workshop floor can close
    // out a job it has just done. Revert by setting technician back to N.
    key: "recordService",
    label: "Record completed services",
    published: true,
    access: { admin: F, manager: F, technician: F, customer: N },
  },
  {
    key: "submitInspection",
    label: "Submit vehicle inspection forms",
    published: true,
    access: { admin: F, manager: F, technician: F, customer: N },
  },
  {
    key: "viewServiceHistory",
    label: "View vehicle service history",
    published: true,
    access: { admin: F, manager: F, technician: F, customer: O },
  },
  {
    key: "viewHealthAndDue",
    label: "View vehicle health scores & due items",
    published: true,
    access: { admin: F, manager: F, technician: F, customer: O },
  },
  {
    key: "downloadInvoice",
    label: "Download service invoices / receipts",
    published: true,
    access: { admin: F, manager: F, technician: N, customer: O },
  },
  {
    key: "requestAppointment",
    label: "Request service appointments",
    published: true,
    access: { admin: N, manager: N, technician: N, customer: F },
  },
  {
    key: "editOwnProfile",
    label: "Edit personal profile / settings",
    published: true,
    access: { admin: F, manager: F, technician: F, customer: F },
  },

  // --- internal guards -------------------------------------------------
  {
    // Registering your own car is not the same as managing the register, which
    // the published matrix reserves for staff. Kept as a separate action so
    // "Add / edit / delete vehicle records" stays true as published.
    key: "addOwnVehicle",
    label: "Register your own vehicle",
    published: false,
    access: { admin: F, manager: F, technician: N, customer: F },
  },
  {
    key: "viewExecutive",
    label: "Executive dashboard",
    published: false,
    access: { admin: F, manager: N, technician: N, customer: N },
  },
  {
    key: "viewBayQueue",
    label: "Workshop bay queue",
    published: false,
    access: { admin: F, manager: F, technician: F, customer: N },
  },
  {
    key: "viewOwnGarage",
    label: "Customer garage",
    published: false,
    access: { admin: N, manager: N, technician: N, customer: F },
  },
  {
    // Technicians see no prices anywhere: the matrix gives them neither
    // financial views nor invoice downloads.
    key: "viewMoney",
    label: "See prices and bills",
    published: false,
    access: { admin: F, manager: F, technician: N, customer: O },
  },
];

const BY_KEY = new Map(MATRIX.map((m) => [m.key, m]));

/** The access level a role has for an action. */
export function accessFor(role: Role, action: Permission): Access {
  return BY_KEY.get(action)?.access[role] ?? "none";
}

/** True for "full" or "own" — i.e. the action is permitted at some scope. */
export function allows(role: Role, action: Permission): boolean {
  return accessFor(role, action) !== "none";
}

/** Roles permitted an action at any scope, for error messages. */
export const rolesAllowed = (action: Permission): Role[] =>
  (["admin", "manager", "technician", "customer"] as Role[]).filter((r) =>
    allows(r, action)
  );

export const PUBLISHED_MATRIX = MATRIX.filter((m) => m.published);

export const ACCESS_LABEL: Record<Access, string> = {
  full: "Yes",
  own: "Own vehicles only",
  none: "No",
};
