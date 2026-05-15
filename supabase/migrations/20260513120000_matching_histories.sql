-- =============================================================================
-- Matching / optimization history for per-user audit & snapshot replay
-- =============================================================================

create table if not exists public.matching_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  resume_title text,
  target_job text,
  score integer not null default 0 check (score >= 0 and score <= 100),
  raw_text_snapshot text not null default '',
  optimized_text_snapshot text not null default '',
  analysis_json jsonb,
  created_at timestamptz not null default now()
);

comment on column public.matching_histories.analysis_json is
  'Structured match analysis: score_summary, gap_items, changes, optimized_content_plain';

comment on table public.matching_histories is 'Per-user AI resume optimization snapshots for history UI';

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
