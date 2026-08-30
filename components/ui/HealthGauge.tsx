import { healthBand } from "@/lib/scoring";

/**
 * Circular health gauge as inline SVG — no chart library, so it inherits the
 * theme tokens and works in both colour schemes. The number is also rendered
 * as text, so it is never colour-alone.
 */
export function HealthGauge({
  score,
  size = 104,
}: {
  score: number;
  size?: number;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  const color = {
    fine: "var(--fine)",
    due_soon: "var(--soon)",
    overdue: "var(--overdue)",
  }[healthBand(score)];

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Vehicle health score ${score} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="nums text-xl font-semibold " style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-muted">health</span>
      </div>
    </div>
  );
}
