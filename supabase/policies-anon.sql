-- =====================================================================
-- Additive only — no drops, safe to run on seeded data.
--
-- Lets a signed-out visitor read the workshop, so the deployed demo opens
-- without credentials. Scoped `to anon`, so it does NOT apply to a signed-in
-- user: an authenticated customer is still restricted to their own vehicles
-- by the policies in schema.sql.
--
-- Read-only by design: no anon insert, update or delete policy exists.
-- =====================================================================

create policy "anon demo read" on app_config
  for select to anon using (true);

create policy "anon demo read" on owners
  for select to anon using (true);

create policy "anon demo read" on vehicles
  for select to anon using (true);

create policy "anon demo read" on odometer_readings
  for select to anon using (true);

create policy "anon demo read" on service_items
  for select to anon using (true);

create policy "anon demo read" on service_history
  for select to anon using (true);

create policy "anon demo read" on service_jobs
  for select to anon using (true);
