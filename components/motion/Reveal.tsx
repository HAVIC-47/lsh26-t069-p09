"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

/**
 * Staggers in any descendant marked `data-reveal`. Those elements start at
 * opacity 0 from globals.css so there is no flash of final state; under
 * reduced motion the stylesheet overrides that to visible and this component
 * only confirms it, animating nothing.
 */
export function Reveal({
  children,
  stagger = 0.05,
  y = 10,
  className = "",
}: {
  children: ReactNode;
  stagger?: number;
  y?: number;
  className?: string;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;

    const targets = el.querySelectorAll("[data-reveal]");
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
          { opacity: 0, y },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: "power2.out",
            stagger,
            clearProps: "transform",
          }
        );
      }
    );

    return () => mm.revert();
  }, [stagger, y]);

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
