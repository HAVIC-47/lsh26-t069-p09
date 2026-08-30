/**
 * Seeds Supabase from the public dataset and creates the four demo accounts.
 * Run once after applying supabase/schema.sql:
 *   npm run seed
 *
 * Loads case PUB-01 — 42 vehicles across 27 owners, which satisfies the
 * required minimum of 40 vehicles and 25 owners.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import raw from "../data/P09_vehicle_service_public.json";
import type { WorkshopCase } from "../lib/types";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || url.includes("PASTE_") || key.includes("PASTE_")) {
  console.error(
    "Missing credentials. Fill NEXT_PUBLIC_SUPABASE_URL and " +
      "SUPABASE_SERVICE_ROLE_KEY in .env.local first."
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const CASE_ID = process.env.SEED_CASE ?? "PUB-01";
const c = (raw as { cases: WorkshopCase[] }).cases.find((x) => x.case_id === CASE_ID);

if (!c) {
  console.error(`Case ${CASE_ID} not found in dataset`);
  process.exit(1);
}

const check = (label: string, error: { message: string } | null) => {
  if (error) {
    console.error(`✗ ${label}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
};

/**
 * Demo password for all four accounts. This is a public demo of a hackathon
 * submission holding no real customer data; the README states the credentials
 * openly so a judge can sign in as each role.
 */
const DEMO_PASSWORD = "RideCatalyst!2026";

const DEMO_USERS = [
  { email: "admin@ridecatalyst.demo",   full_name: "Ayesha Rahman", role: "admin"      },
  { email: "manager@ridecatalyst.demo", full_name: "Tanvir Hasan",  role: "manager"    },
  { email: "tech@ridecatalyst.demo",    full_name: "Sabbir Alam",   role: "technician" },
  { email: "owner@ridecatalyst.demo",   full_name: "",              role: "customer"   },
] as const;

/**
 * Deletes every demo auth user, which cascades their profile rows.
 *
 * Must run BEFORE the owners table is cleared: `profiles.owner_id` is
 * ON DELETE SET NULL, but `profiles` also requires a customer to have an
 * owner_id, so removing an owner while a customer profile points at it
 * violates that check and blocks the delete.
 */
async function clearUsers() {
  const { data } = await db.auth.admin.listUsers();
  for (const u of data?.users ?? []) {
    if (u.email && DEMO_USERS.some((d) => d.email === u.email)) {
      await db.auth.admin.deleteUser(u.id);
    }
  }
  // Any other profile (e.g. a self-signed-up customer) would block the wipe too.
  await db.from("profiles").delete().eq("role", "customer");
  console.log("✓ cleared existing accounts");
}

async function seedWorkshop(cc: WorkshopCase) {
  // Children first. The filter is `id is not null` rather than a value
  // comparison: id is text on some tables and bigint on others, and comparing a
  // sentinel string against a bigint column throws — which the previous version
  // did silently, leaving those tables to be cleared only as a side effect of
  // the vehicles cascade.
  for (const t of [
    "call_logs",
    "inspection_items",
    "inspections",
    "service_requests",
    "service_history",
    "service_jobs",
    "service_items",
    "odometer_readings",
    "vehicles",
    "owners",
  ]) {
    const { error } = await db.from(t).delete().not("id", "is", null);
    // A table the role migration has not created yet is fine to skip; anything
    // else is a real failure and must not pass quietly.
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      console.error(`✗ clearing ${t}: ${error.message}`);
      process.exit(1);
    }
  }
  await db.from("app_config").delete().eq("id", 1);
  console.log("✓ cleared existing rows");

  check(
    "app_config",
    (await db.from("app_config").insert({ id: 1, case_id: cc.case_id, today: cc.today })).error
  );
  check(`owners (${cc.owners.length})`, (await db.from("owners").insert(cc.owners)).error);

  check(
    `vehicles (${cc.vehicles.length})`,
    (
      await db.from("vehicles").insert(
        cc.vehicles.map((v) => ({
          id: v.id,
          owner_id: v.owner_id,
          model: v.model,
          plate: v.plate,
        }))
      )
    ).error
  );

  const readings = cc.vehicles.flatMap((v) =>
    v.odometer_readings.map((r) => ({ vehicle_id: v.id, date: r.date, km: r.km }))
  );
  check(
    `odometer_readings (${readings.length})`,
    (await db.from("odometer_readings").insert(readings)).error
  );

  const items = cc.vehicles.flatMap((v) =>
    v.service_items.map((i) => ({
      vehicle_id: v.id,
      name: i.name,
      rule: i.rule,
      due_date: i.due_date ?? null,
      every_months: i.every_months ?? null,
      every_km: i.every_km ?? null,
      cost_bdt: i.cost_bdt,
    }))
  );
  check(`service_items (${items.length})`, (await db.from("service_items").insert(items)).error);

  const history = cc.vehicles.flatMap((v) =>
    v.service_history.map((h) => ({
      vehicle_id: v.id,
      item_name: h.item,
      date: h.date,
      km: h.km,
      cost_bdt: h.cost_bdt,
    }))
  );
  check(
    `service_history (${history.length})`,
    (await db.from("service_history").insert(history)).error
  );
}

async function seedUsers(cc: WorkshopCase) {
  // The customer account is linked to a real owner from the dataset, so its
  // scoped view has actual vehicles behind it.
  const demoOwner = cc.owners.find((o) =>
    cc.vehicles.some((v) => v.owner_id === o.id)
  )!;

  for (const u of DEMO_USERS) {
    const email = u.email;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      console.error(`✗ create ${email}: ${error?.message}`);
      process.exit(1);
    }

    const isCustomer = u.role === "customer";
    const { error: pErr } = await db.from("profiles").insert({
      id: data.user.id,
      full_name: isCustomer ? demoOwner.name : u.full_name,
      role: u.role,
      owner_id: isCustomer ? demoOwner.id : null,
    });
    if (pErr) {
      console.error(`✗ profile for ${email}: ${pErr.message}`);
      process.exit(1);
    }
    console.log(
      `✓ ${u.role.padEnd(11)} ${email}` +
        (isCustomer ? `  → owner ${demoOwner.id} (${demoOwner.name})` : "")
    );
  }

  return demoOwner;
}

async function main() {
  const cc = c!;
  await clearUsers();
  await seedWorkshop(cc);
  const demoOwner = await seedUsers(cc);

  const owned = cc.vehicles.filter((v) => v.owner_id === demoOwner.id).length;

  console.log(`\nSeeded ${cc.case_id} — workshop "today" is ${cc.today}`);
  console.log(`\nDemo sign-ins (password for all four: ${DEMO_PASSWORD})`);
  for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(11)} ${u.email}`);
  console.log(
    `\nThe customer account sees only ${demoOwner.name}'s ${owned} vehicle(s).`
  );
}

main();
