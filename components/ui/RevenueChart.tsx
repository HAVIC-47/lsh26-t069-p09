import type { MonthRevenue } from "@/lib/scoring";
import { taka } from "@/lib/format";

/**
 * Recorded revenue by month as inline SVG — bars rather than a line, because
 * monthly totals are discrete buckets, not a continuous series. A table
 * alternative follows for screen readers.
 */
export function RevenueChart({ months }: { months: MonthRevenue[] }) {
  const W = 660;
  const H = 200;
  const padX = 8;
  const padTop = 24;
  const padBottom = 34;
  const plot = H - padTop - padBottom;
  const slot = (W - padX * 2) / Math.max(1, months.length);
  const barW = Math.min(56, slot * 0.55);
  const peak = Math.max(1, ...months.map((m) => m.total));

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-52 w-full min-w-[520px]"
          role="img"
          aria-label={`Recorded revenue for the last ${months.length} months`}
        >
          <line
            x1={padX}
            y1={padTop + plot}
            x2={W - padX}
            y2={padTop + plot}
            stroke="var(--border)"
            strokeWidth="1"
          />
          {months.map((m, i) => {
            const h = m.total > 0 ? Math.max(2, (m.total / peak) * plot) : 0;
            const x = padX + i * slot + (slot - barW) / 2;
            const y = padTop + plot - h;
            const isPeak = m.total === peak && peak > 1;
            return (
              <g key={m.month}>
                <title>{`${m.label}: ${taka(m.total)} across ${m.jobs} item(s)`}</title>
                {h > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    rx="4"
                    fill={isPeak ? "var(--accent)" : "var(--chart-bar)"}
                  />
                )}
                <text
                  x={x + barW / 2}
                  y={h > 0 ? y - 7 : padTop + plot - 7}
                  textAnchor="middle"
                  className="nums"
                  fontSize="11"
                  fill="var(--faint)"
                >
                  {m.total > 0 ? Math.round(m.total / 1000) + "k" : "—"}
                </text>
                <text
                  x={x + barW / 2}
                  y={padTop + plot + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--faint)"
                >
                  {m.label.split(" ")[0]}
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
        <table className="mt-2 w-full text-xs">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">Month</th>
              <th className="py-1 pr-3 text-right font-medium">Items</th>
              <th className="py-1 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {months.map((m) => (
              <tr key={m.month}>
                <td className="py-1 pr-3">{m.label}</td>
                <td className="py-1 pr-3 text-right nums">{m.jobs}</td>
                <td className="py-1 text-right nums">{taka(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
