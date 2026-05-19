-- =============================================================================
-- Credits & billing: profiles.credits, credit_transactions, atomic reserve RPC
-- =============================================================================

-- ----- profiles (minimal table if your project has no prior profiles migration) -----
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  credits integer not null default 5,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists credits integer not null default 5;

alter table public.profiles
  alter column credits set default 5;

-- ----- credit_transactions -----
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  action_type text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.credit_transactions is 'Per-user credit ledger (consume, recharge, etc.)';

create index if not exists credit_transactions_user_created_idx
  on public.credit_transactions (user_id, created_at desc);

alter table public.credit_transactions enable row level security;

drop policy if exists credit_transactions_select_own on public.credit_transactions;
drop policy if exists credit_transactions_insert_own on public.credit_transactions;
drop policy if exists credit_transactions_update_own on public.credit_transactions;
drop policy if exists credit_transactions_delete_own on public.credit_transactions;

-- Client: read own ledger only. Mutations go through service-role API routes.
create policy credit_transactions_select_own
  on public.credit_transactions for select
  to authenticated
  using (user_id = auth.uid());

-- ----- profiles RLS (read own row; writes via service role in API) -----
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;

-- Read own profile only. Credit mutations must use service-role API routes.
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- ----- Atomic reserve / refund (service_role from Edge/API only) -----
create or replace function public.try_reserve_optimize_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  update public.profiles
     set credits = credits - 1
   where id = p_user_id
     and credits > 0
  returning credits into v_new;

  return v_new;
end;
$$;

create or replace function public.refund_optimize_credit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set credits = credits + 1
   where id = p_user_id;
end;
$$;

revoke all on function public.try_reserve_optimize_credit(uuid) from public;
revoke all on function public.refund_optimize_credit(uuid) from public;

grant execute on function public.try_reserve_optimize_credit(uuid) to service_role;
grant execute on function public.refund_optimize_credit(uuid) to service_role;
