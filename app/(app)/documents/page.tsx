import Link from "next/link";
import { FileText, ShieldAlert, CalendarClock, Phone, Info } from "lucide-react";
import { loadCase } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { analyse } from "@/lib/engine";
import { formatDate } from "@/lib/dates";
import { taka } from "@/lib/format";
import { StatusBadge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Reveal } from "@/components/motion/Reveal";
import { WorkshopDate } from "@/components/WorkshopDate";

export const dynamic = "force-dynamic";

/**
 * Regulatory paperwork carries a fine, not just a repair bill, so it gets a
 * wider warning window than a mechanical service.
 */
const DOCUMENT_WARNING_DAYS = 30;

export default async function DocumentsPage() {
  await requireRole("viewFinancials");
  const workshop = await loadCase();

  // Only fixed-date items are legal paperwork; a distance-based brake pad is
  // not a document, so the rule itself does the filtering.
  const docs = analyse(workshop)
    .filter((r) => r.rule === "fixed_date")
    .filter((r) => r.daysUntil <= DOCUMENT_WARNING_DAYS)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const expired = docs.filter((d) => d.daysUntil < 0);
  const expiring = docs.filter((d) => d.daysUntil >= 0);
  const exposure = docs.reduce((n, d) => n + d.cost, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Document Expiry Vault</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <WorkshopDate today={workshop.today} />
          <span>
            Insurance, fitness, tax token and battery warranty — {DOCUMENT_WARNING_DAYS}-day
            advance warning
          </span>
        </div>
      </header>

      <Reveal className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard
          label="Already expired"
          value={expired.length}
          hint="driving on these risks a fine"
          tone="overdue"
          icon={ShieldAlert}
        />
        <KpiCard
          label="Expiring soon"
          value={expiring.length}
          hint={`within ${DOCUMENT_WARNING_DAYS} days`}
          tone="soon"
          icon={CalendarClock}
        />
        <KpiCard
          label="Renewal value"
          value={exposure}
          format="taka"
          tone="accent"
          icon={FileText}
        />
      </Reveal>

      <Card padded={false}>
        <CardHeader
          title="Papers needing attention"
          hint="Soonest first — expired papers at the top"
        />
        {docs.length === 0 ? (
          <div className="p-4">
            <Empty
              icon={FileText}
              title="All paperwork is current"
              body={`No document expires within the next ${DOCUMENT_WARNING_DAYS} days.`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Document</th>
                  <th className="px-4 py-2.5 font-medium">Vehicle</th>
                  <th className="px-4 py-2.5 font-medium">Owner</th>
                  <th className="px-4 py-2.5 font-medium">Expires</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Renewal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {docs.map((d) => (
                  <tr
                    key={`${d.vehicleId}-${d.itemName}`}
                    className="transition-colors duration-200 hover:bg-surface-2"
                  >
                    <td className="px-4 py-2.5 font-medium">{d.itemName}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/vehicles/${d.vehicleId}`}
                        className="nums text-xs transition-colors duration-200 hover:text-accent"
                      >
                        {d.plate}
                      </Link>
                      <div className="text-xs text-muted">{d.model}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {d.ownerName}
                      <a
                        href={`tel:${d.ownerPhone}`}
                        className="flex items-center gap-1 nums text-xs text-accent hover:underline"
                      >
                        <Phone className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                        {d.ownerPhone}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 nums text-xs whitespace-nowrap">
                      {formatDate(d.due)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={d.status} daysUntil={d.daysUntil} />
                    </td>
                    <td className="px-4 py-2.5 text-right nums">
                      {taka(d.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>
            Renewal costs are the workshop&rsquo;s catalogue figures from the dataset,
            not live government fees.
          </span>
        </p>
      </Card>
    </div>
  );
}
