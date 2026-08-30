"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_BY_ROLE } from "@/lib/nav";
import type { Role } from "@/lib/types";

/**
 * Role takes a plain string rather than a list of items, because a Lucide icon
 * is a component and cannot cross the server/client boundary.
 */
export function HeaderNav({
  role,
  variant,
}: {
  role: Role;
  variant: "bar" | "rail";
}) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  // Longest matching href wins, so /admin/users does not also light up /admin.
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  if (variant === "bar") {
    return (
      <nav aria-label="Main" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {items.map(({ href, label }) => {
            const active = href === activeHref;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-9 cursor-pointer items-center rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ${
                    active
                      ? "text-heading"
                      : "text-muted hover:bg-surface-2 hover:text-text"
                  }`}
                >
                  {label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 -bottom-px h-px bg-accent"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className="lg:hidden">
      <ul className="flex gap-1 overflow-x-auto px-4 pb-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ${
                  active
                    ? "border-accent bg-accent-soft text-heading"
                    : "border-border text-muted hover:text-text"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
