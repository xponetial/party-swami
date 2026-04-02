create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  event_name text not null check (
    event_name in (
      'account_created',
      'event_created',
      'ai_plan_generated',
      'invite_sent',
      'rsvp_received',
      'shopping_link_clicked',
      'task_completed'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analytics_events_user_id_idx on public.analytics_events(user_id);
create index if not exists analytics_events_event_id_idx on public.analytics_events(event_id);
create index if not exists analytics_events_event_name_idx on public.analytics_events(event_name);
create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
create index if not exists audit_logs_event_id_idx on public.audit_logs(event_id);
create index if not exists audit_logs_action_idx on public.audit_logs(action);

alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "analytics_events_owner_select" on public.analytics_events;
create policy "analytics_events_owner_select"
on public.analytics_events
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.events e
    where e.id = analytics_events.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "analytics_events_owner_insert" on public.analytics_events;
create policy "analytics_events_owner_insert"
on public.analytics_events
for insert
to authenticated
with check (
  user_id = auth.uid()
  or (
    user_id is null
    and exists (
      select 1
      from public.events e
      where e.id = analytics_events.event_id
        and e.owner_id = auth.uid()
    )
  )
);

drop policy if exists "audit_logs_owner_select" on public.audit_logs;
create policy "audit_logs_owner_select"
on public.audit_logs
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.events e
    where e.id = audit_logs.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "audit_logs_owner_insert" on public.audit_logs;
create policy "audit_logs_owner_insert"
on public.audit_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  or (
    user_id is null
    and exists (
      select 1
      from public.events e
      where e.id = audit_logs.event_id
        and e.owner_id = auth.uid()
    )
  )
);

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

  insert into public.analytics_events (user_id, event_name, metadata)
  values (
    new.id,
    'account_created',
    jsonb_build_object(
      'email_domain',
      split_part(coalesce(new.email, ''), '@', 2)
    )
  );

  insert into public.audit_logs (user_id, action, metadata)
  values (
    new.id,
    'account_created',
    jsonb_build_object(
      'email_domain',
      split_part(coalesce(new.email, ''), '@', 2)
    )
  );

  return new;
end;
$$;

create or replace function public.submit_public_rsvp(
  p_slug text,
  p_guest_token text,
  p_status text,
  p_plus_one_count integer default 0
)
returns table (
  guest_id uuid,
  status text,
  plus_one_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_id uuid;
  v_event_id uuid;
  v_updated_at timestamptz;
begin
  if p_status not in ('pending', 'confirmed', 'declined') then
    raise exception 'Invalid RSVP status';
  end if;

  if p_plus_one_count < 0 then
    raise exception 'Plus one count cannot be negative';
  end if;

  select g.id, g.event_id
  into v_guest_id, v_event_id
  from public.guests g
  join public.invites i on i.event_id = g.event_id
  where i.public_slug = p_slug
    and i.is_public = true
    and g.rsvp_token = p_guest_token
  limit 1;

  if v_guest_id is null then
    raise exception 'Guest RSVP link is invalid';
  end if;

  return query
  update public.guests g
  set
    status = p_status,
    plus_one_count = p_plus_one_count,
    updated_at = timezone('utc', now())
  where g.id = v_guest_id
  returning g.id, g.status, g.plus_one_count, g.updated_at;

  select g.updated_at
  into v_updated_at
  from public.guests g
  where g.id = v_guest_id;

  insert into public.analytics_events (event_id, event_name, metadata)
  values (
    v_event_id,
    'rsvp_received',
    jsonb_build_object(
      'guest_id',
      v_guest_id,
      'status',
      p_status,
      'plus_one_count',
      p_plus_one_count,
      'public_slug',
      p_slug
    )
  );

  insert into public.audit_logs (event_id, action, metadata)
  values (
    v_event_id,
    'public_rsvp_submitted',
    jsonb_build_object(
      'guest_id',
      v_guest_id,
      'status',
      p_status,
      'plus_one_count',
      p_plus_one_count,
      'public_slug',
      p_slug,
      'updated_at',
      v_updated_at
    )
  );
end;
$$;
