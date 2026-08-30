"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

/**
 * Above-the-fold entrance. fromTo runs inside useLayoutEffect so the start
 * state is applied before the browser paints — no flash of final position —
 * while leaving the served HTML fully visible for a no-JS reader.
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;

    const targets = el.querySelectorAll("[data-hero]");
    if (targets.length === 0) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        animate: "(prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        if (ctx.conditions?.reduce) {
          gsap.set(targets, { opacity: 1, y: 0 });
          return;
        }
        gsap.fromTo(
          targets,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "power2.out",
            stagger: 0.08,
            clearProps: "transform",
          }
        );
      }
    );

    return () => mm.revert();
  }, []);

  return <div ref={scope}>{children}</div>;
}
