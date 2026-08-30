"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";

const KEY = "rc-theme";

/**
 * Three states, not two: an explicit light or dark choice stamps data-theme on
 * <html>, and "system" removes it so prefers-color-scheme takes over again.
 * The stored choice is applied by an inline script in the layout, before paint,
 * so there is no flash of the wrong theme on load.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      // Private windows and blocked site data throw on access.
    }
    setTheme(stored === "light" || stored === "dark" ? stored : "system");
    setReady(true);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Preference simply does not persist; the page still switches.
    }
  }

  const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "system", label: "System", Icon: Monitor },
    { value: "dark", label: "Dark", Icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        // Before hydration nothing is marked active, so the server and client
        // markup agree and React does not warn about a mismatch.
        const active = ready && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => apply(value)}
            className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ${
              active
                ? "bg-primary text-on-primary"
                : "text-faint hover:bg-surface-2 hover:text-text"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
