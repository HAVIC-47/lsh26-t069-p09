import { Users, ShieldCheck, Check, Minus, CarFront } from "lucide-react";
import {
  requireRole,
  PUBLISHED_MATRIX,
  ROLE_LABEL,
  type Role,
} from "@/lib/auth";
import { admin, hasSupabase } from "@/lib/supabase/admin";
import { Card, CardHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Tag } from "@/components/ui/Badge";
import { Reveal } from "@/components/motion/Reveal";
import { InviteStaffForm, RevokeButton } from "./UserForms";

export const dynamic = "force-dynamic";

const ROLE_ORDER: Role[] = ["admin", "manager", "technician", "customer"];

export default async function UsersPage() {
  const me = await requireRole("manageStaff");

  let accounts: {
    id: string;
    full_name: string;
    role: Role;
    owner_id: string | null;
  }[] = [];

  if (hasSupabase && admin) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, role, owner_id")
      .order("role");
    accounts = (data as typeof accounts) ?? [];
  }

  const byRole = ROLE_ORDER.map((r) => ({
    role: r,
    people: accounts.filter((a) => a.role === r),
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="mt-1.5 text-sm text-muted">
          {accounts.length} account{accounts.length === 1 ? "" : "s"} across four roles
        </p>
      </header>

      <Reveal className="space-y-5">
        <Card data-reveal padded={false}>
          <CardHeader title="Accounts" hint="Grouped by role" />
          {accounts.length === 0 ? (
            <div className="p-4">
              <Empty
                icon={Users}
                title="No accounts found"
                body="Run npm run seed to create the demo accounts, or add staff below."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {byRole
                .filter((g) => g.people.length > 0)
                .map((g) => (
                  <div key={g.role}>
                    <div className="flex items-baseline gap-2 bg-surface-2/50 px-4 py-2">
                      <h3 className="text-sm font-semibold">{ROLE_LABEL[g.role]}</h3>
                      <span className="nums text-xs text-muted">
                        {g.people.length}
                      </span>
                    </div>
                    <ul className="divide-y divide-border">
                      {g.people.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm"
                        >
                          <span className="font-medium">{p.full_name}</span>
                          {p.owner_id && <Tag>owner {p.owner_id}</Tag>}
                          {p.id === me.id && <Tag tone="primary">you</Tag>}
                          <span className="ml-auto">
                            {p.id === me.id ? (
                              <span className="text-xs text-muted">
                                cannot revoke yourself
                              </span>
                            ) : (
                              <RevokeButton id={p.id} name={p.full_name} />
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card data-reveal padded={false}>
          <CardHeader
            title="Add a staff account"
            hint="Technician, manager or admin — created immediately, no email confirmation"
          />
          <div className="px-4 py-4">
            <InviteStaffForm />
          </div>
        </Card>

        <Card data-reveal padded={false}>
          <CardHeader
            title="Roles and permissions"
            hint="The matrix the application enforces, not a description of it"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Capability</th>
                  {ROLE_ORDER.map((r) => (
                    <th key={r} className="px-3 py-2.5 text-center font-medium">
                      {ROLE_LABEL[r].split(" ")[1] ?? ROLE_LABEL[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PUBLISHED_MATRIX.map(({ key, label, access }) => (
                  <tr key={key} className="transition-colors duration-200 hover:bg-surface-2">
                    <td className="px-4 py-2">{label}</td>
                    {ROLE_ORDER.map((r) => (
                      <td key={r} className="px-3 py-2 text-center">
                        {access[r] === "full" && (
                          <Check
                            className="mx-auto h-4 w-4 text-fine"
                            strokeWidth={2.5}
                            aria-label="Yes"
                          />
                        )}
                        {access[r] === "own" && (
                          <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-soon">
                            <CarFront className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                            Own vehicles only
                          </span>
                        )}
                        {access[r] === "none" && (
                          <Minus
                            className="mx-auto h-4 w-4 text-muted/50"
                            strokeWidth={2}
                            aria-label="No"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-xs text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>
              These are the fourteen actions from the roles and permissions
              matrix, rendered from{" "}
              <code className="nums">MATRIX</code> in{" "}
              <code className="nums">lib/permissions.ts</code> — the same
              array every guard reads — so the published rules and the enforced
              rules cannot drift apart. &ldquo;Own vehicles only&rdquo; is a real
              third state, enforced by row-level security in Postgres rather than
              by hiding a menu item.
            </span>
          </p>
        </Card>
      </Reveal>
    </div>
  );
}
