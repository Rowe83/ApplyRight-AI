/**
 * Standalone DDL for Supabase SQL Editor (kept in sync with
 * supabase/migrations/20260513120000_matching_histories.sql).
 * Bundled for the history page “表未创建”提示区。
 */
export const MATCHING_HISTORIES_DDL = `-- matching_histories: AI 优化历史快照
create table if not exists public.matching_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  resume_title text,
  target_job text,
  score integer not null default 0 check (score >= 0 and score <= 100),
  raw_text_snapshot text not null default '',
  optimized_text_snapshot text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists matching_histories_user_created_idx
  on public.matching_histories (user_id, created_at desc);

alter table public.matching_histories enable row level security;

drop policy if exists matching_histories_select_own on public.matching_histories;
drop policy if exists matching_histories_insert_own on public.matching_histories;
drop policy if exists matching_histories_update_own on public.matching_histories;
drop policy if exists matching_histories_delete_own on public.matching_histories;

create policy matching_histories_select_own
  on public.matching_histories for select
  to authenticated
  using (user_id = auth.uid());

create policy matching_histories_insert_own
  on public.matching_histories for insert
  to authenticated
  with check (user_id = auth.uid());

create policy matching_histories_update_own
  on public.matching_histories for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy matching_histories_delete_own
  on public.matching_histories for delete
  to authenticated
  using (user_id = auth.uid());
`
