-- =============================================================================
-- Fix: "new row violates row-level security policy" on resume upload
-- Covers: (1) storage.objects for bucket "resumes" (2) public.resumes INSERT
-- Run after bucket `resumes` exists. Safe to re-run (drops + recreates policies).
-- =============================================================================

-- ----- Storage: resumes bucket (objects live under "<user_uuid>/<file>.pdf") -----
drop policy if exists "resumes_storage_select_own" on storage.objects;
drop policy if exists "resumes_storage_insert_own" on storage.objects;
drop policy if exists "resumes_storage_update_own" on storage.objects;
drop policy if exists "resumes_storage_delete_own" on storage.objects;

create policy "resumes_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resumes'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resumes_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resumes'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resumes_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resumes'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'resumes'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resumes_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resumes'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- ----- Table: public.resumes (INSERT must use role authenticated + user_id match) -----
drop policy if exists resumes_insert_own on public.resumes;

create policy resumes_insert_own
on public.resumes
for insert
to authenticated
with check (user_id = auth.uid());
