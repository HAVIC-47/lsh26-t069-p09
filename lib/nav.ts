import {
  LayoutDashboard,
  Car,
  ChartColumnBig,
  FileText,
  Wrench,
  Warehouse,
  Users,
  Settings,
  ClipboardCheck,
  CalendarPlus,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "./types";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Navigation is per role, not one menu with things greyed out. A technician
 * never sees a Financials link at all, and a customer sees only their own
 * garage — the menu itself is part of the access model.
 */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/desk", label: "Operations", icon: Wrench },
    { href: "/analytics", label: "Financials", icon: ChartColumnBig },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/settings", label: "System Settings", icon: Settings },
  ],
  manager: [
    { href: "/desk", label: "Priority Desk", icon: LayoutDashboard },
    { href: "/vehicles", label: "Fleet & Customers", icon: Car },
    { href: "/analytics", label: "8-Week Forecast", icon: ChartColumnBig },
    { href: "/documents", label: "Documents", icon: FileText },
  ],
  technician: [
    { href: "/bay", label: "Today's Vehicles", icon: Warehouse },
    { href: "/bay/inspect", label: "Inspections", icon: ClipboardCheck },
    { href: "/vehicles", label: "History Lookup", icon: Car },
  ],
  customer: [
    { href: "/garage", label: "My Garage", icon: Car },
    { href: "/garage/book", label: "Book Appointment", icon: CalendarPlus },
    { href: "/garage/profile", label: "Profile", icon: Users },
  ],
};
