import { Settings as SettingsIcon, Package, Info, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { loadCase } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { taka } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Badge";
import { Reveal } from "@/components/motion/Reveal";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

const RULE_LABEL: Record<string, string> = {
  fixed_date: "Fixed date",
  period_months: "Time based",
  distance_km: "Distance based",
};

export default async function SettingsPage() {
  await requireRole("editCatalogue");

  const [{ settings, stored }, workshop] = await Promise.all([
    getSettings(),
    loadCase(),
  ]);

  // The catalogue is stored per vehicle, so collapse it to the distinct item
  // types the workshop offers, with the price range actually seen.
  const catalogue = new Map<
    string,
    { rule: string; interval: string; min: number; max: number; count: number }
  >();

  for (const v of workshop.vehicles) {
    for (const i of v.service_items) {
      const cost = parseFloat(i.cost_bdt);
      const interval =
        i.rule === "period_months"
          ? `every ${i.every_months} months`
          : i.rule === "distance_km"
            ? `every ${i.every_km?.toLocaleString()} km`
            : "printed expiry date";
      const e = catalogue.get(i.name) ?? {
        rule: i.rule,
        interval,
        min: cost,
        max: cost,
        count: 0,
      };
      e.min = Math.min(e.min, cost);
      e.max = Math.max(e.max, cost);
      e.count += 1;
      catalogue.set(i.name, e);
    }
  }

  const rows = [...catalogue.entries()].sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
        <p className="mt-1.5 text-sm text-muted">
          The variables every prediction in the workshop is calculated from
        </p>
      </header>

      {!stored && (
        <p className="flex items-start gap-2 rounded-xl border border-soon bg-soon-bg px-4 py-3 text-sm text-soon">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>
            Showing the compiled-in defaults. Run{" "}
            <code className="nums">supabase/migration-roles.sql</code> to make
            these editable and stored in the database.
          </span>
        </p>
      )}

      <Reveal className="space-y-5">
        <Card data-reveal padded={false}>
          <CardHeader
            title="Predictive variables"
            hint="Changing these re-dates every item in the workshop immediately"
          />
          <div className="px-4 py-4">
            <SettingsForm settings={settings} />
          </div>
          <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-xs text-muted">
            <SettingsIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>
              These are not display preferences. The due-soon window decides which
              items reach the call desk at all, and the assumed daily running is
              what a brand-new vehicle is scheduled against until it has a second
              odometer reading.
            </span>
          </p>
        </Card>

        <Card data-reveal padded={false}>
          <CardHeader
            title="Service item catalogue"
            hint={`${rows.length} item types across ${workshop.vehicles.length} vehicles`}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Rule</th>
                  <th className="px-4 py-2.5 font-medium">Interval</th>
                  <th className="px-4 py-2.5 text-right font-medium">On vehicles</th>
                  <th className="px-4 py-2.5 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(([name, e]) => (
                  <tr key={name} className="transition-colors duration-200 hover:bg-surface-2">
                    <td className="px-4 py-2.5 font-medium">{name}</td>
                    <td className="px-4 py-2.5">
                      <Tag>{RULE_LABEL[e.rule]}</Tag>
                    </td>
                    <td className="px-4 py-2.5 nums text-xs text-muted">
                      {e.interval}
                    </td>
                    <td className="px-4 py-2.5 text-right nums">
                      {e.count}
                    </td>
                    <td className="px-4 py-2.5 text-right nums">
                      {e.min === e.max ? taka(e.min) : `${taka(e.min)}–${taka(e.max)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-xs text-muted">
            <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>
              Read-only for now. Prices and intervals are stored per vehicle in the
              dataset rather than as a shared catalogue, so editing one centrally
              would need a catalogue table with per-vehicle overrides — noted in
              the README as the next step.
            </span>
          </p>
        </Card>
      </Reveal>

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          The workshop&rsquo;s date is fixed by the seeded dataset at{" "}
          <span className="nums text-text">{workshop.today}</span> and is not
          editable here — every due date on every screen is measured from it, so
          changing it would silently rewrite the whole demo.
        </span>
      </p>
    </div>
  );
}
