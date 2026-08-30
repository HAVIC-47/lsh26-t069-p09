-- =====================================================================
-- ServiceDue — full schema (workshop data + roles + call logs + jobs)
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- Safe to re-run: it drops and recreates everything it owns.
-- =====================================================================

drop table if exists service_jobs      cascade;
drop table if exists call_logs         cascade;
drop table if exists service_history   cascade;
drop table if exists service_items     cascade;
drop table if exists odometer_readings cascade;
drop table if exists vehicles          cascade;
drop table if exists owners            cascade;
drop table if exists profiles          cascade;
drop table if exists app_config        cascade;

drop function if exists auth_role()      cascade;
drop function if exists auth_owner_id()  cascade;
drop function if exists is_staff()       cascade;
drop function if exists can_write_work() cascade;
drop type     if exists user_role        cascade;

-- =====================================================================
-- 1. Reference data
-- =====================================================================

-- The workshop's "today" comes from the dataset, never the server clock, so
-- the demo shows the same due dates on any day it is opened.
create table app_config (
  id      int primary key default 1 check (id = 1),
  case_id text not null,
  today   date not null
);

create table owners (
  id    text primary key,
  name  text not null,
  phone text not null
);

create table vehicles (
  id       text primary key,
  owner_id text not null references owners(id) on delete cascade,
  model    text not null,
  plate    text not null
);

create table odometer_readings (
  id         bigserial primary key,
  vehicle_id text not null references vehicles(id) on delete cascade,
  date       date not null,
  km         integer not null check (km >= 0),
  unique (vehicle_id, date)
);

-- Each rule carries exactly the parameters it needs and no others; the check
-- constraint makes an item with the wrong shape unstorable rather than
-- silently undatable at render time.
create table service_items (
  id           bigserial primary key,
  vehicle_id   text not null references vehicles(id) on delete cascade,
  name         text not null,
  rule         text not null check (rule in ('fixed_date','period_months','distance_km')),
  due_date     date,
  every_months integer,
  every_km     integer,
  cost_bdt     numeric(12,2) not null check (cost_bdt >= 0),
  unique (vehicle_id, name),
  constraint rule_shape check (
    (rule = 'fixed_date'    and due_date is not null and every_months is null and every_km is null) or
    (rule = 'period_months' and every_months is not null and due_date is null and every_km is null) or
    (rule = 'distance_km'   and every_km is not null and due_date is null and every_months is null)
  )
);

-- =====================================================================
-- 2. People and roles
-- =====================================================================

create type user_role as enum ('admin', 'manager', 'technician', 'customer');

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       user_role not null default 'technician',
  -- Only set for the customer role: the owner whose vehicles they may see.
  owner_id   text references owners(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_needs_owner
    check (role <> 'customer' or owner_id is not null)
);

-- These read `profiles` from inside `profiles` policies, so they must be
-- SECURITY DEFINER — otherwise the policy would recurse into itself.
create function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create function auth_owner_id() returns text
language sql stable security definer set search_path = public as $$
  select owner_id from profiles where id = auth.uid()
$$;

/* Any workshop employee. Customers are deliberately excluded. */
create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('admin','manager','technician'), false)
$$;

/* Who may record completed work: the office, not the workshop floor. */
create function can_write_work() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('admin','manager'), false)
$$;

-- =====================================================================
-- 3. Work records
-- =====================================================================

-- A job sheet: one visit, many items. Grouping lives here so that recording a
-- visit still writes one service_history row per item, which is what the
-- dating engine reads.
create table service_jobs (
  id            bigserial primary key,
  vehicle_id    text not null references vehicles(id) on delete cascade,
  date          date not null,
  odometer      integer,
  technician_id uuid references profiles(id) on delete set null,
  note          text,
  total_bdt     numeric(12,2) not null default 0,
  created_at    timestamptz not null default now()
);

-- km is null for time-based services — no odometer is taken for an air filter.
create table service_history (
  id         bigserial primary key,
  vehicle_id text not null references vehicles(id) on delete cascade,
  item_name  text not null,
  date       date not null,
  km         integer,
  cost_bdt   numeric(12,2) not null,
  job_id     bigint references service_jobs(id) on delete cascade,
  foreign key (vehicle_id, item_name)
    references service_items(vehicle_id, name) on delete cascade
);

create table call_logs (
  id            bigserial primary key,
  vehicle_id    text not null references vehicles(id) on delete cascade,
  disposition   text not null check (disposition in (
                  'scheduled','no_answer','postponed','declined','reminder_sent')),
  scheduled_for date,
  note          text,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index on vehicles          (owner_id);
create index on odometer_readings (vehicle_id, date desc);
create index on service_items     (vehicle_id);
create index on service_history   (vehicle_id, item_name, date desc);
create index on service_jobs      (vehicle_id, date desc);
create index on call_logs         (vehicle_id, created_at desc);
create index on profiles          (owner_id);

-- =====================================================================
-- 4. Row-level security
--
-- Staff see the whole workshop. A customer sees only the vehicles belonging
-- to the owner their profile is linked to. Writes are limited by role.
--
-- NOTE: the service-role key bypasses every policy below by design, so server
-- actions ALSO check the caller's role in application code (lib/auth.ts).
-- These policies are the second line, not the only one.
-- =====================================================================

alter table app_config        enable row level security;
alter table owners            enable row level security;
alter table vehicles          enable row level security;
alter table odometer_readings enable row level security;
alter table service_items     enable row level security;
alter table service_history   enable row level security;
alter table service_jobs      enable row level security;
alter table call_logs         enable row level security;
alter table profiles          enable row level security;

-- ---- profiles -------------------------------------------------------
create policy "read own profile" on profiles
  for select using (id = auth.uid());
create policy "admin reads all profiles" on profiles
  for select using (auth_role() = 'admin');
create policy "admin manages profiles" on profiles
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---- app_config -----------------------------------------------------
create policy "any signed-in user reads config" on app_config
  for select using (auth.uid() is not null);

-- ---- owners ---------------------------------------------------------
create policy "staff read owners" on owners
  for select using (is_staff());
create policy "customer reads own owner" on owners
  for select using (id = auth_owner_id());
create policy "office writes owners" on owners
  for all using (can_write_work()) with check (can_write_work());

-- ---- vehicles -------------------------------------------------------
create policy "staff read vehicles" on vehicles
  for select using (is_staff());
create policy "customer reads own vehicles" on vehicles
  for select using (owner_id = auth_owner_id());
create policy "office writes vehicles" on vehicles
  for all using (can_write_work()) with check (can_write_work());

-- ---- odometer readings ---------------------------------------------
create policy "staff read readings" on odometer_readings
  for select using (is_staff());
create policy "customer reads own readings" on odometer_readings
  for select using (exists (
    select 1 from vehicles v
    where v.id = odometer_readings.vehicle_id and v.owner_id = auth_owner_id()));
-- Technicians take readings at intake, so staff (not just the office) may add.
create policy "staff record readings" on odometer_readings
  for insert with check (is_staff());
create policy "staff update readings" on odometer_readings
  for update using (is_staff()) with check (is_staff());

-- ---- service items (the catalogue) ---------------------------------
create policy "staff read items" on service_items
  for select using (is_staff());
create policy "customer reads own items" on service_items
  for select using (exists (
    select 1 from vehicles v
    where v.id = service_items.vehicle_id and v.owner_id = auth_owner_id()));
create policy "admin edits catalogue" on service_items
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---- service history ------------------------------------------------
create policy "staff read history" on service_history
  for select using (is_staff());
create policy "customer reads own history" on service_history
  for select using (exists (
    select 1 from vehicles v
    where v.id = service_history.vehicle_id and v.owner_id = auth_owner_id()));
create policy "office records work" on service_history
  for insert with check (can_write_work());

-- ---- service jobs ---------------------------------------------------
create policy "staff read jobs" on service_jobs
  for select using (is_staff());
create policy "customer reads own jobs" on service_jobs
  for select using (exists (
    select 1 from vehicles v
    where v.id = service_jobs.vehicle_id and v.owner_id = auth_owner_id()));
create policy "office records jobs" on service_jobs
  for insert with check (can_write_work());

-- ---- call logs (internal only — never visible to a customer) --------
create policy "staff read call logs" on call_logs
  for select using (is_staff());
create policy "office logs calls" on call_logs
  for insert with check (can_write_work());

-- ---- signed-out demo access ----------------------------------------
-- Scoped `to anon`, so it never widens what a signed-in user can see: an
-- authenticated customer is still limited to their own vehicles above.
-- Read-only by design — there is no anon insert/update/delete policy.
create policy "anon demo read" on app_config        for select to anon using (true);
create policy "anon demo read" on owners            for select to anon using (true);
create policy "anon demo read" on vehicles          for select to anon using (true);
create policy "anon demo read" on odometer_readings for select to anon using (true);
create policy "anon demo read" on service_items     for select to anon using (true);
create policy "anon demo read" on service_history   for select to anon using (true);
create policy "anon demo read" on service_jobs      for select to anon using (true);
