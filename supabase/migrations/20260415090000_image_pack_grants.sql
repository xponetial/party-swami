create table if not exists public.user_image_pack_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_month date not null,
  stripe_checkout_session_id text not null unique,
  pack_quantity integer not null default 1 check (pack_quantity > 0),
  additional_images integer not null check (additional_images > 0),
  additional_budget_usd numeric(10, 2) not null check (additional_budget_usd > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_image_pack_grants_user_id_usage_month_idx
  on public.user_image_pack_grants(user_id, usage_month desc);

alter table public.user_image_pack_grants enable row level security;

drop policy if exists "user_image_pack_grants_owner_read" on public.user_image_pack_grants;
create policy "user_image_pack_grants_owner_read"
on public.user_image_pack_grants
for select
to authenticated
using (user_id = auth.uid());
