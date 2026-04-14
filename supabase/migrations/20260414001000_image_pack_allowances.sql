create table if not exists public.user_image_monthly_allowances (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_month date not null,
  additional_images integer not null default 0 check (additional_images >= 0),
  additional_budget_usd numeric(10, 2) not null default 0 check (additional_budget_usd >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, usage_month)
);

create index if not exists user_image_monthly_allowances_user_id_usage_month_idx
  on public.user_image_monthly_allowances(user_id, usage_month desc);

drop trigger if exists set_user_image_monthly_allowances_updated_at on public.user_image_monthly_allowances;
create trigger set_user_image_monthly_allowances_updated_at
before update on public.user_image_monthly_allowances
for each row
execute function public.set_updated_at();

alter table public.user_image_monthly_allowances enable row level security;

drop policy if exists "user_image_monthly_allowances_owner_read" on public.user_image_monthly_allowances;
create policy "user_image_monthly_allowances_owner_read"
on public.user_image_monthly_allowances
for select
to authenticated
using (user_id = auth.uid());
