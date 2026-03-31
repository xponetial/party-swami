create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_type text not null,
  event_date timestamptz,
  location text,
  guest_target integer check (guest_target is null or guest_target >= 0),
  budget numeric(10, 2) check (budget is null or budget >= 0),
  theme text,
  status text not null default 'draft' check (status in ('draft', 'planning', 'ready')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.party_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  theme text,
  invite_copy text,
  menu jsonb not null default '[]'::jsonb,
  shopping_categories jsonb not null default '[]'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  raw_response jsonb,
  generated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  design_json jsonb,
  invite_copy text,
  public_slug text not null unique default replace(gen_random_uuid()::text, '-', ''),
  is_public boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  plus_one_count integer not null default 0 check (plus_one_count >= 0),
  notes text,
  rsvp_token text not null unique default (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  last_contacted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.guest_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'share_link', 'manual')),
  message_type text not null check (message_type in ('invite', 'reminder', 'follow_up', 'note')),
  subject text,
  body text,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  name text not null default 'Main List',
  retailer text check (retailer is null or retailer in ('amazon', 'walmart', 'mixed')),
  currency_code text not null default 'USD',
  estimated_total numeric(10, 2) not null default 0 check (estimated_total >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  category text not null,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  estimated_price numeric(10, 2) check (estimated_price is null or estimated_price >= 0),
  status text not null default 'pending' check (status in ('pending', 'ready', 'purchased', 'removed')),
  external_url text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  due_label text,
  phase text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'overdue')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.timeline_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  detail text not null,
  starts_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_owner_id_idx on public.events(owner_id);
create index if not exists events_event_date_idx on public.events(event_date);
create index if not exists guests_event_id_idx on public.guests(event_id);
create index if not exists guests_email_idx on public.guests(email);
create index if not exists guest_messages_event_id_idx on public.guest_messages(event_id);
create index if not exists guest_messages_guest_id_idx on public.guest_messages(guest_id);
create index if not exists shopping_items_shopping_list_id_idx on public.shopping_items(shopping_list_id);
create index if not exists tasks_event_id_idx on public.tasks(event_id);
create index if not exists tasks_due_at_idx on public.tasks(due_at);
create index if not exists timeline_items_event_id_idx on public.timeline_items(event_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

drop trigger if exists set_party_plans_updated_at on public.party_plans;
create trigger set_party_plans_updated_at
before update on public.party_plans
for each row
execute function public.set_updated_at();

drop trigger if exists set_invites_updated_at on public.invites;
create trigger set_invites_updated_at
before update on public.invites
for each row
execute function public.set_updated_at();

drop trigger if exists set_guests_updated_at on public.guests;
create trigger set_guests_updated_at
before update on public.guests
for each row
execute function public.set_updated_at();

drop trigger if exists set_guest_messages_updated_at on public.guest_messages;
create trigger set_guest_messages_updated_at
before update on public.guest_messages
for each row
execute function public.set_updated_at();

drop trigger if exists set_shopping_lists_updated_at on public.shopping_lists;
create trigger set_shopping_lists_updated_at
before update on public.shopping_lists
for each row
execute function public.set_updated_at();

drop trigger if exists set_shopping_items_updated_at on public.shopping_items;
create trigger set_shopping_items_updated_at
before update on public.shopping_items
for each row
execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

drop trigger if exists set_timeline_items_updated_at on public.timeline_items;
create trigger set_timeline_items_updated_at
before update on public.timeline_items
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.party_plans enable row level security;
alter table public.invites enable row level security;
alter table public.guests enable row level security;
alter table public.guest_messages enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.tasks enable row level security;
alter table public.timeline_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "events_owner_all" on public.events;
create policy "events_owner_all"
on public.events
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "party_plans_owner_all" on public.party_plans;
create policy "party_plans_owner_all"
on public.party_plans
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = party_plans.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = party_plans.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "invites_owner_all" on public.invites;
create policy "invites_owner_all"
on public.invites
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = invites.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = invites.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "guests_owner_all" on public.guests;
create policy "guests_owner_all"
on public.guests
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = guests.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = guests.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "guest_messages_owner_all" on public.guest_messages;
create policy "guest_messages_owner_all"
on public.guest_messages
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = guest_messages.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = guest_messages.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "shopping_lists_owner_all" on public.shopping_lists;
create policy "shopping_lists_owner_all"
on public.shopping_lists
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = shopping_lists.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = shopping_lists.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "shopping_items_owner_all" on public.shopping_items;
create policy "shopping_items_owner_all"
on public.shopping_items
for all
to authenticated
using (
  exists (
    select 1
    from public.shopping_lists sl
    join public.events e on e.id = sl.event_id
    where sl.id = shopping_items.shopping_list_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shopping_lists sl
    join public.events e on e.id = sl.event_id
    where sl.id = shopping_items.shopping_list_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "tasks_owner_all" on public.tasks;
create policy "tasks_owner_all"
on public.tasks
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = tasks.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = tasks.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "timeline_items_owner_all" on public.timeline_items;
create policy "timeline_items_owner_all"
on public.timeline_items
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = timeline_items.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = timeline_items.event_id
      and e.owner_id = auth.uid()
  )
);
