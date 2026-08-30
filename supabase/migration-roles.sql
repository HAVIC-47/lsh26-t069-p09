-- =====================================================================
-- Role rework migration. Run this ONCE, after schema.sql and npm run seed.
-- It does not drop any table and deletes no workshop data.
--
-- 1. Revokes signed-out access to workshop data
-- 2. Adds the tunable predictive variables to app_config
-- 3. Adds inspections (technician) and service_requests (customer)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. No more signed-out reads. An unauthenticated request now sees
--    nothing: no owners, no vehicles, no items, no history.
-- ---------------------------------------------------------------------
drop policy if exists "anon demo read" on app_config;
drop policy if exists "anon demo read" on owners;
drop policy if exists "anon demo read" on vehicles;
drop policy if exists "anon demo read" on odometer_readings;
drop policy if exists "anon demo read" on service_items;
drop policy if exists "anon demo read" on service_history;
drop policy if exists "anon demo read" on service_jobs;

-- ---------------------------------------------------------------------
-- 2. Predictive variables become configuration rather than constants,
--    so the admin can tune them without a redeploy.
-- ---------------------------------------------------------------------
alter table app_config
  add column if not exists soon_days          integer not null default 30,
  add column if not exists default_km_per_day integer not null default 25,
  add column if not exists max_km_per_day     integer not null default 500,
  add column if not exists churn_days         integer not null default 45,
  add column if not exists document_days      integer not null default 30;

drop policy if exists "admin edits config" on app_config;
create policy "admin edits config" on app_config
  for update using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- 3a. Digital inspections — filled in by a technician at the bay.
--     Starts empty: nothing in the dataset seeds an inspection.
-- ---------------------------------------------------------------------
create table if not exists inspections (
  id            bigserial primary key,
  vehicle_id    text not null references vehicles(id) on delete cascade,
  technician_id uuid references profiles(id) on delete set null,
  odometer      integer,
  note          text,
  created_at    timestamptz not null default now()
);

create table if not exists inspection_items (
  id            bigserial primary key,
  inspection_id bigint not null references inspections(id) on delete cascade,
  point         text not null,
  -- 'attention' is what raises the item on the manager's desk.
  verdict       text not null check (verdict in ('pass','attention','fail')),
  note          text
);

create index if not exists inspections_vehicle_idx
  on inspections (vehicle_id, created_at desc);
create index if not exists inspection_items_parent_idx
  on inspection_items (inspection_id);

alter table inspections      enable row level security;
alter table inspection_items enable row level security;

create policy "staff read inspections" on inspections
  for select using (is_staff());
create policy "customer reads own inspections" on inspections
  for select using (exists (
    select 1 from vehicles v
    where v.id = inspections.vehicle_id and v.owner_id = auth_owner_id()));
create policy "staff record inspections" on inspections
  for insert with check (is_staff());

create policy "staff read inspection items" on inspection_items
  for select using (is_staff());
create policy "customer reads own inspection items" on inspection_items
  for select using (exists (
    select 1 from inspections i
    join vehicles v on v.id = i.vehicle_id
    where i.id = inspection_items.inspection_id and v.owner_id = auth_owner_id()));
create policy "staff record inspection items" on inspection_items
  for insert with check (is_staff());

-- ---------------------------------------------------------------------
-- 3b. Service requests — raised by a customer, actioned by the office.
-- ---------------------------------------------------------------------
create table if not exists service_requests (
  id            bigserial primary key,
  vehicle_id    text not null references vehicles(id) on delete cascade,
  requested_by  uuid references profiles(id) on delete set null,
  preferred_date date not null,
  note          text,
  status        text not null default 'pending'
                check (status in ('pending','confirmed','declined','done')),
  created_at    timestamptz not null default now()
);

create index if not exists service_requests_status_idx
  on service_requests (status, preferred_date);

alter table service_requests enable row level security;

create policy "staff read requests" on service_requests
  for select using (is_staff());
create policy "customer reads own requests" on service_requests
  for select using (exists (
    select 1 from vehicles v
    where v.id = service_requests.vehicle_id and v.owner_id = auth_owner_id()));
create policy "customer raises requests" on service_requests
  for insert with check (
    auth_role() = 'customer' and exists (
      select 1 from vehicles v
      where v.id = service_requests.vehicle_id and v.owner_id = auth_owner_id()));
create policy "office updates requests" on service_requests
  for update using (can_write_work()) with check (can_write_work());
