import type { WeekBucket } from "@/lib/scoring";
import { taka } from "@/lib/format";
import { formatDate } from "@/lib/dates";

/**
 * Eight-week workload as inline SVG — no charting library, so it inherits the
 * theme tokens directly and works in both colour schemes. A table alternative
 * follows it for screen readers and for anyone who wants the numbers.
 */
export function ForecastChart({
  buckets,
  peak,
}: {
  buckets: WeekBucket[];
  peak: number;
}) {
  const W = 720;
  const H = 220;
  const padX = 8;
  const padTop = 26;
  const padBottom = 40;
  const plot = H - padTop - padBottom;
  const slot = (W - padX * 2) / buckets.length;
  const barW = Math.min(52, slot * 0.6);
  const safePeak = Math.max(1, peak);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-56 w-full min-w-[560px]"
          role="img"
          aria-label={`Projected workshop revenue for the next ${buckets.length} weeks`}
        >
          {/* baseline */}
          <line
            x1={padX}
            y1={padTop + plot}
            x2={W - padX}
            y2={padTop + plot}
            stroke="var(--border)"
            strokeWidth="1"
          />

          {buckets.map((b, i) => {
            const h = Math.max(2, (b.revenue / safePeak) * plot);
            const x = padX + i * slot + (slot - barW) / 2;
            const y = padTop + plot - h;
            const isPeak = b.revenue === peak && peak > 0;

            return (
              <g key={b.index}>
                <title>
                  {`Week ${b.index}, from ${formatDate(b.start)}: ${b.vehicles} vehicles, ${taka(b.revenue)}`}
                </title>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx="4"
                  fill={isPeak ? "var(--accent)" : "var(--chart-bar)"}
                />
                <text
                  x={x + barW / 2}
                  y={y - 7}
                  textAnchor="middle"
                  className="nums"
                  fontSize="11"
                  fill="var(--faint)"
                >
                  {b.revenue > 0 ? Math.round(b.revenue / 1000) + "k" : ""}
                </text>
                <text
                  x={x + barW / 2}
                  y={padTop + plot + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--faint)"
                >
                  w{b.index}
                </text>
                <text
                  x={x + barW / 2}
                  y={padTop + plot + 30}
                  textAnchor="middle"
                  className="nums"
                  fontSize="10"
                  fill="var(--faint)"
                >
                  {b.vehicles}v
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted hover:text-text">
          Show the figures as a table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Week</th>
                <th className="py-1 pr-3 font-medium">Starting</th>
                <th className="py-1 pr-3 text-right font-medium">Vehicles</th>
                <th className="py-1 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {buckets.map((b) => (
                <tr key={b.index}>
                  <td className="py-1 pr-3">w{b.index}</td>
                  <td className="py-1 pr-3 nums">{formatDate(b.start)}</td>
                  <td className="py-1 pr-3 text-right nums">
                    {b.vehicles}
                  </td>
                  <td className="py-1 text-right nums">
                    {taka(b.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
