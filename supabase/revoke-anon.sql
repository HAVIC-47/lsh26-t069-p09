-- =====================================================================
-- Revokes signed-out access to workshop data.
--
-- After this, an unauthenticated request reads NOTHING: no owners, no
-- vehicles, no items, no history. The landing page explains the product and
-- nothing else. Every role-scoped policy from schema.sql still applies to
-- signed-in users, unchanged.
--
-- Additive/destructive only to the seven `anon demo read` policies — no table
-- is dropped and no row is deleted.
-- =====================================================================

drop policy if exists "anon demo read" on app_config;
drop policy if exists "anon demo read" on owners;
drop policy if exists "anon demo read" on vehicles;
drop policy if exists "anon demo read" on odometer_readings;
drop policy if exists "anon demo read" on service_items;
drop policy if exists "anon demo read" on service_history;
drop policy if exists "anon demo read" on service_jobs;

-- A signed-in user of any role still needs the workshop's "today", so this
-- replaces the anon config policy with an authenticated-only one.
-- (schema.sql already grants this; re-stated here in case it was dropped.)
drop policy if exists "any signed-in user reads config" on app_config;
create policy "any signed-in user reads config" on app_config
  for select using (auth.uid() is not null);
