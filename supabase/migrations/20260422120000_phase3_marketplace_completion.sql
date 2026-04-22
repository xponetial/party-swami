create table if not exists public.zip_code_locations (
  zip_code text primary key check (zip_code ~ '^\d{5}$'),
  city text not null,
  state text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.vendors
add column if not exists service_notes text,
add column if not exists response_time_hours integer not null default 24 check (response_time_hours > 0),
add column if not exists profile_image_url text;

alter table public.planners
add column if not exists service_notes text,
add column if not exists response_time_hours integer not null default 24 check (response_time_hours > 0),
add column if not exists profile_image_url text;

create table if not exists public.marketplace_provider_packages (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  planner_id uuid references public.planners(id) on delete cascade,
  title text not null,
  description text not null,
  price numeric(10, 2) check (price is null or price >= 0),
  price_label text,
  display_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_provider_packages_one_provider check (
    (vendor_id is not null and planner_id is null)
    or (vendor_id is null and planner_id is not null)
  )
);

alter table public.marketplace_leads
add column if not exists package_id uuid references public.marketplace_provider_packages(id) on delete set null,
add column if not exists admin_note text;

create table if not exists public.marketplace_lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.marketplace_leads(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  from_status text,
  to_status text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.marketplace_notifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.marketplace_leads(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('admin', 'provider', 'host')),
  recipient_email text not null,
  subject text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  provider_type text check (provider_type in ('vendor', 'planner')),
  provider_name text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete cascade,
  planner_id uuid references public.planners(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_reviews_one_provider check (
    (vendor_id is not null and planner_id is null)
    or (vendor_id is null and planner_id is not null)
  )
);

create index if not exists marketplace_provider_packages_vendor_id_idx on public.marketplace_provider_packages(vendor_id);
create index if not exists marketplace_provider_packages_planner_id_idx on public.marketplace_provider_packages(planner_id);
create index if not exists marketplace_provider_packages_status_idx on public.marketplace_provider_packages(status);
create index if not exists marketplace_leads_package_id_idx on public.marketplace_leads(package_id);
create index if not exists marketplace_lead_activity_lead_id_idx on public.marketplace_lead_activity(lead_id);
create index if not exists marketplace_notifications_lead_id_idx on public.marketplace_notifications(lead_id);
create index if not exists marketplace_notifications_status_idx on public.marketplace_notifications(status);
create index if not exists marketplace_reviews_vendor_id_idx on public.marketplace_reviews(vendor_id);
create index if not exists marketplace_reviews_planner_id_idx on public.marketplace_reviews(planner_id);
create index if not exists marketplace_reviews_status_idx on public.marketplace_reviews(status);

drop trigger if exists set_marketplace_provider_packages_updated_at on public.marketplace_provider_packages;
create trigger set_marketplace_provider_packages_updated_at
before update on public.marketplace_provider_packages
for each row
execute function public.set_updated_at();

drop trigger if exists set_marketplace_reviews_updated_at on public.marketplace_reviews;
create trigger set_marketplace_reviews_updated_at
before update on public.marketplace_reviews
for each row
execute function public.set_updated_at();

alter table public.zip_code_locations enable row level security;
alter table public.marketplace_provider_packages enable row level security;
alter table public.marketplace_lead_activity enable row level security;
alter table public.marketplace_notifications enable row level security;
alter table public.marketplace_reviews enable row level security;

drop policy if exists "zip_code_locations_public_select" on public.zip_code_locations;
create policy "zip_code_locations_public_select"
on public.zip_code_locations
for select
to anon, authenticated
using (true);

drop policy if exists "marketplace_provider_packages_public_active_select" on public.marketplace_provider_packages;
create policy "marketplace_provider_packages_public_active_select"
on public.marketplace_provider_packages
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "marketplace_provider_packages_vendor_owner_all" on public.marketplace_provider_packages;
create policy "marketplace_provider_packages_vendor_owner_all"
on public.marketplace_provider_packages
for all
to authenticated
using (
  exists (
    select 1 from public.vendors v
    where v.id = marketplace_provider_packages.vendor_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vendors v
    where v.id = marketplace_provider_packages.vendor_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists "marketplace_provider_packages_planner_owner_all" on public.marketplace_provider_packages;
create policy "marketplace_provider_packages_planner_owner_all"
on public.marketplace_provider_packages
for all
to authenticated
using (
  exists (
    select 1 from public.planners p
    where p.id = marketplace_provider_packages.planner_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.planners p
    where p.id = marketplace_provider_packages.planner_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "marketplace_lead_activity_consumer_select" on public.marketplace_lead_activity;
drop policy if exists "marketplace_lead_activity_actor_insert" on public.marketplace_lead_activity;
create policy "marketplace_lead_activity_actor_insert"
on public.marketplace_lead_activity
for insert
to authenticated
with check (actor_id = auth.uid());

drop policy if exists "marketplace_lead_activity_consumer_select" on public.marketplace_lead_activity;
create policy "marketplace_lead_activity_consumer_select"
on public.marketplace_lead_activity
for select
to authenticated
using (
  exists (
    select 1 from public.marketplace_leads l
    where l.id = marketplace_lead_activity.lead_id
      and l.consumer_id = auth.uid()
  )
);

drop policy if exists "marketplace_lead_activity_provider_select" on public.marketplace_lead_activity;
create policy "marketplace_lead_activity_provider_select"
on public.marketplace_lead_activity
for select
to authenticated
using (
  exists (
    select 1
    from public.marketplace_leads l
    join public.vendors v on v.id = l.vendor_id
    where l.id = marketplace_lead_activity.lead_id
      and v.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.marketplace_leads l
    join public.planners p on p.id = l.planner_id
    where l.id = marketplace_lead_activity.lead_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "marketplace_notifications_consumer_select" on public.marketplace_notifications;
create policy "marketplace_notifications_consumer_select"
on public.marketplace_notifications
for select
to authenticated
using (
  exists (
    select 1 from public.marketplace_leads l
    where l.id = marketplace_notifications.lead_id
      and l.consumer_id = auth.uid()
  )
);

drop policy if exists "marketplace_reviews_public_approved_select" on public.marketplace_reviews;
create policy "marketplace_reviews_public_approved_select"
on public.marketplace_reviews
for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "marketplace_reviews_consumer_insert" on public.marketplace_reviews;
create policy "marketplace_reviews_consumer_insert"
on public.marketplace_reviews
for insert
to authenticated
with check (consumer_id = auth.uid());

drop policy if exists "marketplace_reviews_consumer_select" on public.marketplace_reviews;
create policy "marketplace_reviews_consumer_select"
on public.marketplace_reviews
for select
to authenticated
using (consumer_id = auth.uid());

insert into public.zip_code_locations (zip_code, city, state, latitude, longitude)
values
  ('75043', 'Garland', 'TX', 32.856800, -96.599200),
  ('75040', 'Garland', 'TX', 32.912600, -96.630500),
  ('75041', 'Garland', 'TX', 32.879500, -96.652100),
  ('75042', 'Garland', 'TX', 32.919000, -96.674500),
  ('75218', 'Dallas', 'TX', 32.842700, -96.698500),
  ('75228', 'Dallas', 'TX', 32.822400, -96.679500),
  ('75150', 'Mesquite', 'TX', 32.815800, -96.631300),
  ('75088', 'Rowlett', 'TX', 32.902900, -96.547400),
  ('78701', 'Austin', 'TX', 30.271100, -97.743700),
  ('78702', 'Austin', 'TX', 30.263800, -97.714800),
  ('78703', 'Austin', 'TX', 30.290300, -97.766500),
  ('78704', 'Austin', 'TX', 30.245700, -97.768800),
  ('78745', 'Austin', 'TX', 30.207800, -97.796700),
  ('78613', 'Cedar Park', 'TX', 30.505200, -97.820300),
  ('78620', 'Dripping Springs', 'TX', 30.190200, -98.086700),
  ('78664', 'Round Rock', 'TX', 30.517500, -97.672100)
on conflict (zip_code) do update
set
  city = excluded.city,
  state = excluded.state,
  latitude = excluded.latitude,
  longitude = excluded.longitude;

insert into public.vendors (
  owner_id,
  business_name,
  slug,
  category,
  city,
  state,
  zip_code,
  service_radius_miles,
  contact_name,
  contact_email,
  contact_phone,
  website_url,
  pricing_model,
  starting_price,
  description,
  portfolio_urls,
  status,
  is_verified,
  service_notes,
  response_time_hours
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    'Lakewood Sugar Studio',
    'lakewood-sugar-studio',
    'Bakery',
    'Dallas',
    'TX',
    '75218',
    18,
    'Ana Williams',
    'hello@lakewoodsugar.example',
    '214-555-0301',
    'https://example.com/lakewood-sugar',
    'fixed_packages',
    125,
    'Custom celebration cakes, sugar cookies, and dessert tables for birthdays, school celebrations, showers, and lake-area family gatherings in East Dallas and Garland.',
    array['https://example.com/lakewood-sugar/cakes', 'https://example.com/lakewood-sugar/cookies'],
    'active',
    true,
    'Best for 12 to 80 guests. Rush orders depend on design complexity.',
    12
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'Garland Glow Events',
    'garland-glow-events',
    'Decor',
    'Garland',
    'TX',
    '75043',
    20,
    'Monica Reed',
    'events@garlandglow.example',
    '972-555-0302',
    'https://example.com/garland-glow',
    'fixed_packages',
    225,
    'Balloon garlands, shimmer walls, kids party backdrops, and fast setup decor packages for Garland, Rowlett, Mesquite, and East Dallas hosts.',
    array['https://example.com/garland-glow/balloons', 'https://example.com/garland-glow/backdrops'],
    'active',
    true,
    'Most installs take 60 to 90 minutes and include takedown options.',
    8
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'Rowlett Rhythm DJ',
    'rowlett-rhythm-dj',
    'DJ',
    'Rowlett',
    'TX',
    '75088',
    25,
    'Darius King',
    'bookings@rowlettrhythm.example',
    '972-555-0303',
    'https://example.com/rowlett-rhythm',
    'custom_quotes',
    500,
    'DJ, MC, simple uplighting, and party sound support for birthdays, graduations, cookouts, and community celebrations around Lake Ray Hubbard.',
    array['https://example.com/rowlett-rhythm/parties'],
    'active',
    false,
    'Evening and weekend events available with two weeks notice.',
    24
  )
on conflict (slug) do update
set
  owner_id = excluded.owner_id,
  business_name = excluded.business_name,
  category = excluded.category,
  city = excluded.city,
  state = excluded.state,
  zip_code = excluded.zip_code,
  service_radius_miles = excluded.service_radius_miles,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  website_url = excluded.website_url,
  pricing_model = excluded.pricing_model,
  starting_price = excluded.starting_price,
  description = excluded.description,
  portfolio_urls = excluded.portfolio_urls,
  status = excluded.status,
  is_verified = excluded.is_verified,
  service_notes = excluded.service_notes,
  response_time_hours = excluded.response_time_hours,
  updated_at = timezone('utc', now());

insert into public.planners (
  owner_id,
  business_name,
  slug,
  city,
  state,
  zip_code,
  service_radius_miles,
  contact_name,
  contact_email,
  contact_phone,
  website_url,
  years_experience,
  certifications,
  consultation_price,
  hourly_rate,
  full_service_minimum,
  bio,
  services,
  availability_note,
  status,
  is_verified,
  service_notes,
  response_time_hours
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    'East Dallas Party Desk',
    'east-dallas-party-desk',
    'Dallas',
    'TX',
    '75218',
    30,
    'Tessa Moore',
    'plan@eastdallaspartydesk.example',
    '214-555-0401',
    'https://example.com/east-dallas-party-desk',
    6,
    'Family party and milestone event specialist serving East Dallas, Garland, Mesquite, and Rowlett.',
    65,
    115,
    1600,
    'East Dallas Party Desk helps hosts quickly turn a loose party idea into a vendor shortlist, shopping priorities, and a clean week-of timeline.',
    array['Consultation', 'Vendor sourcing', 'Budget planning', 'Day-of coordination'],
    'Weeknight consults are usually available within three business days.',
    'active',
    true,
    'Strong fit for birthdays, graduations, neighborhood events, and backyard parties.',
    12
  )
on conflict (slug) do update
set
  owner_id = excluded.owner_id,
  business_name = excluded.business_name,
  city = excluded.city,
  state = excluded.state,
  zip_code = excluded.zip_code,
  service_radius_miles = excluded.service_radius_miles,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  website_url = excluded.website_url,
  years_experience = excluded.years_experience,
  certifications = excluded.certifications,
  consultation_price = excluded.consultation_price,
  hourly_rate = excluded.hourly_rate,
  full_service_minimum = excluded.full_service_minimum,
  bio = excluded.bio,
  services = excluded.services,
  availability_note = excluded.availability_note,
  status = excluded.status,
  is_verified = excluded.is_verified,
  service_notes = excluded.service_notes,
  response_time_hours = excluded.response_time_hours,
  updated_at = timezone('utc', now());

insert into public.marketplace_provider_packages (vendor_id, planner_id, title, description, price, price_label, display_order, status)
select v.id, null, package.title, package.description, package.price, package.price_label, package.display_order, 'active'
from public.vendors v
cross join lateral (
  values
    ('Dessert starter', 'Small cake or cupcake set for intimate celebrations.', 95::numeric, 'from $95', 1),
    ('Party table bundle', 'Dessert table concept, baked goods, and delivery planning.', 275::numeric, 'from $275', 2)
) as package(title, description, price, price_label, display_order)
where v.slug in ('sugar-moon-bakery-austin', 'lakewood-sugar-studio')
on conflict do nothing;

insert into public.marketplace_provider_packages (vendor_id, planner_id, title, description, price, price_label, display_order, status)
select v.id, null, package.title, package.description, package.price, package.price_label, package.display_order, 'active'
from public.vendors v
cross join lateral (
  values
    ('Backdrop moment', 'Balloon garland or shimmer wall for a photo-ready focal point.', 225::numeric, 'from $225', 1),
    ('Room refresh', 'Decor direction, tablescape accents, and party install support.', 450::numeric, 'from $450', 2)
) as package(title, description, price, price_label, display_order)
where v.slug in ('table-bloom-decor', 'garland-glow-events')
on conflict do nothing;

insert into public.marketplace_provider_packages (vendor_id, planner_id, title, description, price, price_label, display_order, status)
select v.id, null, package.title, package.description, package.price, package.price_label, package.display_order, 'active'
from public.vendors v
cross join lateral (
  values
    ('Party sound', 'DJ set, standard audio, and basic event flow support.', 450::numeric, 'from $450', 1),
    ('Dance floor plus', 'DJ, MC support, lighting, and timeline coordination.', 750::numeric, 'from $750', 2)
) as package(title, description, price, price_label, display_order)
where v.category = 'DJ'
on conflict do nothing;

insert into public.marketplace_provider_packages (vendor_id, planner_id, title, description, price, price_label, display_order, status)
select null, p.id, package.title, package.description, package.price, package.price_label, package.display_order, 'active'
from public.planners p
cross join lateral (
  values
    ('Quick consult', 'A focused planning call with vendor, budget, and timeline guidance.', 65::numeric, 'from $65', 1),
    ('Vendor shortlist', 'Planner-curated recommendations for the event type, budget, and ZIP.', 175::numeric, 'from $175', 2),
    ('Day-of support', 'Timeline, vendor handoff, and event-day coordination.', 650::numeric, 'custom quote', 3)
) as package(title, description, price, price_label, display_order)
where p.status = 'active'
on conflict do nothing;

insert into public.marketplace_reviews (consumer_id, vendor_id, planner_id, rating, title, body, status)
select null, v.id, null, 5, 'Easy dessert planning', 'Clear packages and fast guidance made the dessert table feel handled without a long planning cycle.', 'approved'
from public.vendors v
where v.slug in ('sugar-moon-bakery-austin', 'lakewood-sugar-studio')
on conflict do nothing;

insert into public.marketplace_reviews (consumer_id, vendor_id, planner_id, rating, title, body, status)
select null, null, p.id, 5, 'Helpful first call', 'The consultation helped narrow the event priorities and gave us a practical vendor path.', 'approved'
from public.planners p
where p.slug in ('bright-table-events', 'east-dallas-party-desk')
on conflict do nothing;
