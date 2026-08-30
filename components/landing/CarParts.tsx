/**
 * Line-art service parts, drawn rather than sourced so they share one stroke
 * weight and inherit the theme colours. Each is a 48-unit square viewBox so
 * they can be laid out on a grid without per-part fudging.
 */

type PartProps = { className?: string };

/**
 * Trig results are rounded before they reach the DOM. Unrounded floats can
 * serialise differently on the server and the client, which React reports as a
 * hydration mismatch — the numbers agree, their string forms do not.
 */
const at = (deg: number, r: number, c = 24) => ({
  x: +(c + r * Math.cos((deg * Math.PI) / 180)).toFixed(2),
  y: +(c + r * Math.sin((deg * Math.PI) / 180)).toFixed(2),
});

const S = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BrakeDisc({ className }: PartProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="15" {...S} />
      <circle cx="24" cy="24" r="6" {...S} />
      <circle cx="24" cy="24" r="1.6" fill="currentColor" stroke="none" />
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const { x, y } = at(a, 10);
        return <circle key={a} cx={x} cy={y} r="1.5" {...S} />;
      })}
      <path d="M24 9v3M39 24h-3M24 39v-3M9 24h3" {...S} />
    </svg>
  );
}

export function Tyre({ className }: PartProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="15" {...S} />
      <circle cx="24" cy="24" r="8" {...S} />
      {[15, 75, 135, 195, 255, 315].map((a) => {
        const inner = at(a, 10.5);
        const outer = at(a, 14);
        return (
          <path
            key={a}
            d={`M${inner.x} ${inner.y} L${outer.x} ${outer.y}`}
            {...S}
          />
        );
      })}
    </svg>
  );
}

export function OilDrop({ className }: PartProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M24 9c0 0 10 11.5 10 18a10 10 0 1 1-20 0C14 20.5 24 9 24 9z" {...S} />
      <path d="M19.5 28.5a5 5 0 0 0 4 5.5" {...S} />
    </svg>
  );
}

export function AirFilter({ className }: PartProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="9" y="14" width="30" height="20" rx="3" {...S} />
      <path d="M15 14v20M21 14v20M27 14v20M33 14v20" {...S} />
      <path d="M9 19h30M9 29h30" {...S} strokeWidth={1} strokeOpacity={0.45} />
    </svg>
  );
}

export function SparkPlug({ className }: PartProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M21 8h6v7h-6z" {...S} />
      <path d="M19.5 15h9l-1 6h-7z" {...S} />
      <path d="M20 21h8v8h-8z" {...S} />
      <path d="M20 24h8M20 26.5h8" {...S} strokeWidth={1} strokeOpacity={0.5} />
      <path d="M22.5 29v7M25.5 29v4.5h4" {...S} />
    </svg>
  );
}

export function Battery({ className }: PartProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="8" y="17" width="32" height="17" rx="2.5" {...S} />
      <path d="M15 17v-3h5v3M28 17v-3h5v3" {...S} />
      <path d="M17 25.5h5M19.5 23v5" {...S} />
      <path d="M27 25.5h5" {...S} />
    </svg>
  );
}

export function Document({ className }: PartProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M13 9h15l7 7v23a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z" {...S} />
      <path d="M28 9v7h7" {...S} />
      <path d="M16 24h16M16 29h16M16 34h10" {...S} strokeWidth={1.3} />
    </svg>
  );
}

export function Wrench({ className }: PartProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M33 12a7 7 0 0 0-9.3 8.6L12.4 31.9a3 3 0 0 0 4.2 4.2l11.3-11.3A7 7 0 0 0 36 15.6l-4.2 4.2-3.5-3.5L32.5 12z"
        {...S}
      />
    </svg>
  );
}

export const PARTS = [
  { Part: OilDrop, label: "Engine oil", rule: "Every 3 months" },
  { Part: BrakeDisc, label: "Brake pads", rule: "Every 10,000 km" },
  { Part: Document, label: "Insurance", rule: "Fixed expiry" },
  { Part: Tyre, label: "Tyres", rule: "Every 40,000 km" },
  { Part: AirFilter, label: "Air filter", rule: "Every 6 months" },
  { Part: SparkPlug, label: "Spark plugs", rule: "Every 20,000 km" },
  { Part: Battery, label: "Battery", rule: "Warranty date" },
  { Part: Wrench, label: "AC service", rule: "Every 12 months" },
];
