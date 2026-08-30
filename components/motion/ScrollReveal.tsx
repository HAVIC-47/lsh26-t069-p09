"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Reveals children as they scroll into view.
 *
 * Uses gsap.from(), not fromTo(), so the markup's natural state is the visible
 * one: if JS never runs the content is simply there. Registration happens in
 * the effect rather than at module scope, which keeps ScrollTrigger away from
 * the server render.
 */
export function ScrollReveal({
  children,
  className = "",
  y = 24,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  stagger?: number;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scope.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);
    const targets = el.querySelectorAll("[data-reveal]");
    if (targets.length === 0) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        animate: "(prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        // No scroll-driven motion at all under reduced motion — the guidance is
        // explicit that scroll effects cause nausea, so the content just sits.
        if (ctx.conditions?.reduce) return;

        gsap.from(targets, {
          opacity: 0,
          y,
          duration: 0.5,
          ease: "power2.out",
          stagger,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
        });
      }
    );

    return () => mm.revert();
  }, [y, stagger]);

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
