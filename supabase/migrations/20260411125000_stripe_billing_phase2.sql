alter table public.profiles
add column if not exists stripe_customer_id text,
add column if not exists stripe_subscription_id text,
add column if not exists stripe_price_id text,
add column if not exists billing_status text;

alter table public.profiles
drop constraint if exists profiles_billing_status_check;

alter table public.profiles
add constraint profiles_billing_status_check
check (
  billing_status is null
  or billing_status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')
);

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_idx
  on public.profiles(stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_event_type text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.stripe_webhook_events enable row level security;

drop policy if exists "stripe_webhook_events_no_client_access" on public.stripe_webhook_events;
create policy "stripe_webhook_events_no_client_access"
on public.stripe_webhook_events
for all
to authenticated
using (false)
with check (false);
