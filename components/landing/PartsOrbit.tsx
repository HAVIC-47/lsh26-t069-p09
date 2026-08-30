"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { PARTS } from "./CarParts";
import { Monogram } from "@/components/brand/Monogram";

/**
 * The hero figure: eight service parts arranged around a hub, each labelled
 * with the rule that dates it — which is the product in one picture.
 *
 * Parts fly in on a stagger, then drift on a slow loop. gsap.fromTo applies the
 * start state inside useLayoutEffect, before paint, so the served HTML stays
 * visible for a reader with no JS instead of being stranded at opacity 0.
 */
export function PartsOrbit() {
  const scope = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        animate: "(prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        const parts = el.querySelectorAll<HTMLElement>("[data-part]");
        const hub = el.querySelector("[data-hub]");
        const rings = el.querySelectorAll("[data-ring]");

        if (ctx.conditions?.reduce) {
          gsap.set([...parts, hub, ...rings], { opacity: 1, scale: 1, x: 0, y: 0 });
          return;
        }

        const tl = gsap.timeline();

        tl.fromTo(
          hub,
          { opacity: 0, scale: 0.75 },
          { opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" }
        )
          .fromTo(
            rings,
            { opacity: 0, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out", stagger: 0.08 },
            "-=0.35"
          )
          .fromTo(
            parts,
            {
              opacity: 0,
              scale: 0.6,
              // each part arrives from its own direction, away from the hub
              x: (i: number) => Math.cos((i / PARTS.length) * Math.PI * 2) * 90,
              y: (i: number) => Math.sin((i / PARTS.length) * Math.PI * 2) * 90,
            },
            {
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
              duration: 0.75,
              ease: "power3.out",
              stagger: { each: 0.07, from: "start" },
            },
            "-=0.6"
          );

        // Settled state: a slow, tiny drift so the figure is not dead still.
        parts.forEach((p, i) => {
          gsap.to(p, {
            y: i % 2 === 0 ? -6 : 6,
            duration: 3.2 + (i % 3) * 0.6,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: 1.1 + i * 0.08,
          });
        });

        return () => tl.kill();
      }
    );

    return () => mm.revert();
  }, []);

  return (
    <div ref={scope} className="relative mx-auto w-full max-w-lg">
      {/* concentric rings, purely decorative */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          data-ring
          className="absolute aspect-square w-[62%] rounded-full border border-border"
        />
        <div
          data-ring
          className="absolute aspect-square w-[88%] rounded-full border border-border/60"
        />
      </div>

      <div className="relative grid grid-cols-4 gap-3 sm:gap-4">
        {PARTS.slice(0, 2).map(({ Part, label, rule }) => (
          <PartCell key={label} Part={Part} label={label} rule={rule} span />
        ))}

        {/* hub */}
        <div
          data-hub
          className="col-span-2 row-span-2 flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-4 text-center"
        >
          <Monogram size={40} className="text-heading" />
          <p className="mt-2 font-display text-[15px] leading-tight font-semibold text-heading">
            Every part,
            <br />
            its own clock
          </p>
          <p className="eyebrow mt-1.5 text-[9px]">3 rules · 1 date</p>
        </div>

        {PARTS.slice(2, 4).map(({ Part, label, rule }) => (
          <PartCell key={label} Part={Part} label={label} rule={rule} span />
        ))}
        {PARTS.slice(4).map(({ Part, label, rule }) => (
          <PartCell key={label} Part={Part} label={label} rule={rule} />
        ))}
      </div>
    </div>
  );
}

function PartCell({
  Part,
  label,
  rule,
  span = false,
}: {
  Part: (p: { className?: string }) => React.JSX.Element;
  label: string;
  rule: string;
  span?: boolean;
}) {
  return (
    <div
      data-part
      className={`flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/70 p-3 text-center backdrop-blur-sm transition-colors duration-200 hover:border-accent/50 ${
        span ? "" : ""
      }`}
    >
      <Part className="h-8 w-8 text-heading" />
      <span className="mt-1.5 text-[11px] leading-tight font-medium text-text">
        {label}
      </span>
      <span className="nums mt-0.5 text-[10px] leading-tight text-faint">{rule}</span>
    </div>
  );
}
