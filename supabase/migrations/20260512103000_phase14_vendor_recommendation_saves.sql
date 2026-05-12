create table if not exists public.marketplace_saved_vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_saved_vendors_unique unique (user_id, event_id, vendor_id)
);

create index if not exists marketplace_saved_vendors_user_event_idx
  on public.marketplace_saved_vendors(user_id, event_id);

create index if not exists marketplace_saved_vendors_vendor_idx
  on public.marketplace_saved_vendors(vendor_id);

drop trigger if exists set_marketplace_saved_vendors_updated_at on public.marketplace_saved_vendors;
create trigger set_marketplace_saved_vendors_updated_at
before update on public.marketplace_saved_vendors
for each row
execute function public.set_updated_at();

alter table public.marketplace_saved_vendors enable row level security;

drop policy if exists "marketplace_saved_vendors_owner_select" on public.marketplace_saved_vendors;
create policy "marketplace_saved_vendors_owner_select"
on public.marketplace_saved_vendors
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "marketplace_saved_vendors_owner_insert" on public.marketplace_saved_vendors;
create policy "marketplace_saved_vendors_owner_insert"
on public.marketplace_saved_vendors
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "marketplace_saved_vendors_owner_delete" on public.marketplace_saved_vendors;
create policy "marketplace_saved_vendors_owner_delete"
on public.marketplace_saved_vendors
for delete
to authenticated
using (user_id = auth.uid());
