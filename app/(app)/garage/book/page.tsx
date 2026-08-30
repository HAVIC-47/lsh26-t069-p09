import { CalendarPlus, Car, Clock } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { loadCase } from "@/lib/data";
import { analyse } from "@/lib/engine";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { taka } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Tag } from "@/components/ui/Badge";
import { Reveal } from "@/components/motion/Reveal";
import { BookingForm } from "./BookingForm";

export const dynamic = "force-dynamic";

type RequestRow = {
  id: number;
  vehicle_id: string;
  preferred_date: string;
  note: string | null;
  status: "pending" | "confirmed" | "declined" | "done";
  created_at: string;
};

const STATUS_TONE = {
  pending: "neutral",
  confirmed: "primary",
  declined: "neutral",
  done: "primary",
} as const;

export default async function BookPage() {
  await requireRole("requestAppointment");
  const workshop = await loadCase();
  const rows = analyse(workshop);

  // The table may not exist until the role migration is applied, so a failure
  // here degrades to "no requests yet" rather than breaking the page.
  let requests: RequestRow[] = [];
  const supabase = await createSessionClient();
  if (supabase) {
    const { data } = await supabase
      .from("service_requests")
      .select("id, vehicle_id, preferred_date, note, status, created_at")
      .order("created_at", { ascending: false });
    requests = (data as RequestRow[]) ?? [];
  }

  const plateOf = (id: string) =>
    workshop.vehicles.find((v) => v.id === id)?.plate ?? id;

  const due = rows.filter((r) => r.status !== "fine");
  const dueValue = due.reduce((n, r) => n + r.cost, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Book an Appointment</h1>
        <p className="mt-1.5 text-sm text-muted">
          Send the workshop a preferred date. They confirm the time with you.
        </p>
      </header>

      {workshop.vehicles.length === 0 ? (
        <Empty
          icon={Car}
          title="No vehicles on your account"
          body="Ask the workshop to link your vehicle before booking."
        />
      ) : (
        <Reveal className="space-y-5">
          {due.length > 0 && (
            <p
              data-reveal
              className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted"
            >
              You have{" "}
              <span className="font-medium text-text">
                {due.length} item{due.length === 1 ? "" : "s"}
              </span>{" "}
              due or overdue, estimated at{" "}
              <span className="nums text-text">{taka(dueValue)}</span>. Mention
              anything else below and the workshop will quote for it.
            </p>
          )}

          <Card data-reveal padded={false}>
            <CardHeader title="Request a service" />
            <div className="px-4 py-4">
              <BookingForm
                vehicles={workshop.vehicles.map((v) => ({
                  id: v.id,
                  plate: v.plate,
                  model: v.model,
                }))}
                today={workshop.today}
              />
            </div>
          </Card>

          <Card data-reveal padded={false}>
            <CardHeader title="Your requests" />
            {requests.length === 0 ? (
              <div className="p-4">
                <Empty
                  icon={Clock}
                  title="No requests yet"
                  body="Anything you send will appear here with its status."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {requests.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-2 text-sm">
                      <CalendarPlus
                        className="h-3.5 w-3.5 shrink-0 text-muted"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span className="nums font-medium">
                        {plateOf(r.vehicle_id)}
                      </span>
                      <span className="text-muted">
                        for {formatDate(r.preferred_date)}
                      </span>
                      <span className="ml-auto">
                        <Tag tone={STATUS_TONE[r.status]}>{r.status}</Tag>
                      </span>
                    </div>
                    {r.note && <p className="mt-1 text-xs text-muted">{r.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Reveal>
      )}
    </div>
  );
}
