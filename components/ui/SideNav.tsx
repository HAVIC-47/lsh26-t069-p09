"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";

/** Sidebar from lg up; a horizontally scrollable tab bar below it. */
export function SideNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);


  return (
    <nav aria-label="Main">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
