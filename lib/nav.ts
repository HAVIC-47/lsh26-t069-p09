import {
  LayoutDashboard,
  Car,
  ChartColumnBig,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Only routes that exist are listed — a nav that links to nothing reads as
 * broken. Entries are added as each phase lands.
 */
export const NAV: NavItem[] = [
  { href: "/desk", label: "Call Desk", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/analytics", label: "Analytics", icon: ChartColumnBig },
  { href: "/documents", label: "Documents", icon: FileText },
];
