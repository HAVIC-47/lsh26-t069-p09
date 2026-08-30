"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export type CountFormat = "number" | "taka" | "percent";

/**
 * `format` is a string union rather than a function because this renders
 * inside server components, and functions cannot cross that boundary.
 */
function render(n: number, format: CountFormat) {
  const rounded = Math.round(n);
  if (format === "taka") return `Tk ${rounded.toLocaleString("en-US")}`;
  if (format === "percent") return `${rounded}%`;
  return rounded.toLocaleString("en-US");
}

export function CountUp({
  value,
  format = "number",
  className = "",
}: {
  value: number;
  format?: CountFormat;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        animate: "(prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        if (ctx.conditions?.reduce) {
          el.textContent = render(value, format);
          return;
        }
        const counter = { n: 0 };
        gsap.to(counter, {
          n: value,
          duration: 0.8,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = render(counter.n, format);
          },
          onComplete: () => {
            el.textContent = render(value, format);
          },
        });
      }
    );

    return () => mm.revert();
  }, [value, format]);

  // Server-rendered text is the final value, so the number is correct with no
  // JS and correct for a screen reader before the tween finishes.
  return (
    <span ref={ref} className={className}>
      {render(value, format)}
    </span>
  );
}
