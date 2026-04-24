create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  category text not null,
  city text not null,
  state text,
  zip_code text not null,
  service_radius_miles integer not null default 25 check (service_radius_miles > 0),
  contact_name text,
  contact_email text not null,
  contact_phone text,
  website_url text,
  affiliate_url text,
  pricing_model text not null check (pricing_model in ('fixed_packages', 'custom_quotes', 'affiliate_links')),
  starting_price numeric(10, 2) check (starting_price is null or starting_price >= 0),
  description text not null,
  portfolio_urls text[] not null default '{}'::text[],
  status text not null default 'active' check (status in ('active', 'paused', 'pending_review')),
  is_verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.planners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  city text not null,
  state text,
  zip_code text not null,
  service_radius_miles integer not null default 35 check (service_radius_miles > 0),
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  website_url text,
  years_experience integer check (years_experience is null or years_experience >= 0),
  certifications text,
  consultation_price numeric(10, 2) check (consultation_price is null or consultation_price >= 0),
  hourly_rate numeric(10, 2) check (hourly_rate is null or hourly_rate >= 0),
  full_service_minimum numeric(10, 2) check (full_service_minimum is null or full_service_minimum >= 0),
  bio text not null,
  services text[] not null default '{}'::text[],
  availability_note text,
  status text not null default 'active' check (status in ('active', 'paused', 'pending_review')),
  is_verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.marketplace_leads (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  planner_id uuid references public.planners(id) on delete set null,
  lead_type text not null check (lead_type in ('vendor', 'planner_consultation', 'planner_full_service')),
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  event_type text,
  event_date timestamptz,
  event_zip_code text,
  budget numeric(10, 2) check (budget is null or budget >= 0),
  message text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_leads_one_provider check (
    (vendor_id is not null and planner_id is null and lead_type = 'vendor')
    or (vendor_id is null and planner_id is not null and lead_type in ('planner_consultation', 'planner_full_service'))
  )
);

create index if not exists vendors_owner_id_idx on public.vendors(owner_id);
create index if not exists vendors_slug_idx on public.vendors(slug);
create index if not exists vendors_category_idx on public.vendors(category);
create index if not exists vendors_zip_code_idx on public.vendors(zip_code);
create index if not exists vendors_status_idx on public.vendors(status);

create index if not exists planners_owner_id_idx on public.planners(owner_id);
create index if not exists planners_slug_idx on public.planners(slug);
create index if not exists planners_zip_code_idx on public.planners(zip_code);
create index if not exists planners_status_idx on public.planners(status);

create index if not exists marketplace_leads_consumer_id_idx on public.marketplace_leads(consumer_id);
create index if not exists marketplace_leads_event_id_idx on public.marketplace_leads(event_id);
create index if not exists marketplace_leads_vendor_id_idx on public.marketplace_leads(vendor_id);
create index if not exists marketplace_leads_planner_id_idx on public.marketplace_leads(planner_id);
create index if not exists marketplace_leads_status_idx on public.marketplace_leads(status);

drop trigger if exists set_vendors_updated_at on public.vendors;
create trigger set_vendors_updated_at
before update on public.vendors
for each row
execute function public.set_updated_at();

drop trigger if exists set_planners_updated_at on public.planners;
create trigger set_planners_updated_at
before update on public.planners
for each row
execute function public.set_updated_at();

drop trigger if exists set_marketplace_leads_updated_at on public.marketplace_leads;
create trigger set_marketplace_leads_updated_at
before update on public.marketplace_leads
for each row
execute function public.set_updated_at();

alter table public.vendors enable row level security;
alter table public.planners enable row level security;
alter table public.marketplace_leads enable row level security;

drop policy if exists "vendors_public_active_select" on public.vendors;
create policy "vendors_public_active_select"
on public.vendors
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "vendors_owner_insert" on public.vendors;
create policy "vendors_owner_insert"
on public.vendors
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "vendors_owner_update" on public.vendors;
create policy "vendors_owner_update"
on public.vendors
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "vendors_owner_delete" on public.vendors;
create policy "vendors_owner_delete"
on public.vendors
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "planners_public_active_select" on public.planners;
create policy "planners_public_active_select"
on public.planners
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "planners_owner_insert" on public.planners;
create policy "planners_owner_insert"
on public.planners
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "planners_owner_update" on public.planners;
create policy "planners_owner_update"
on public.planners
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "planners_owner_delete" on public.planners;
create policy "planners_owner_delete"
on public.planners
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "marketplace_leads_consumer_insert" on public.marketplace_leads;
create policy "marketplace_leads_consumer_insert"
on public.marketplace_leads
for insert
to authenticated
with check (consumer_id = auth.uid());

drop policy if exists "marketplace_leads_consumer_select" on public.marketplace_leads;
create policy "marketplace_leads_consumer_select"
on public.marketplace_leads
for select
to authenticated
using (consumer_id = auth.uid());

drop policy if exists "marketplace_leads_vendor_owner_select" on public.marketplace_leads;
create policy "marketplace_leads_vendor_owner_select"
on public.marketplace_leads
for select
to authenticated
using (
  exists (
    select 1
    from public.vendors v
    where v.id = marketplace_leads.vendor_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists "marketplace_leads_planner_owner_select" on public.marketplace_leads;
create policy "marketplace_leads_planner_owner_select"
on public.marketplace_leads
for select
to authenticated
using (
  exists (
    select 1
    from public.planners p
    where p.id = marketplace_leads.planner_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "marketplace_leads_provider_owner_update" on public.marketplace_leads;
create policy "marketplace_leads_provider_owner_update"
on public.marketplace_leads
for update
to authenticated
using (
  exists (
    select 1
    from public.vendors v
    where v.id = marketplace_leads.vendor_id
      and v.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.planners p
    where p.id = marketplace_leads.planner_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vendors v
    where v.id = marketplace_leads.vendor_id
      and v.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.planners p
    where p.id = marketplace_leads.planner_id
      and p.owner_id = auth.uid()
  )
);
