-- Payment orders for idempotent Stripe (and future provider) fulfillment

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  package_id text not null,
  provider text not null default 'stripe',
  provider_session_id text not null,
  provider_payment_intent_id text,
  amount_cents integer not null,
  status text not null default 'pending',
  credits_granted integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists payment_orders_provider_session_idx
  on public.payment_orders (provider_session_id);

create index if not exists payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc);

comment on table public.payment_orders is 'External payment sessions; used for idempotent credit fulfillment';

alter table public.payment_orders enable row level security;

drop policy if exists payment_orders_select_own on public.payment_orders;

create policy payment_orders_select_own
  on public.payment_orders for select
  to authenticated
  using (user_id = auth.uid());
