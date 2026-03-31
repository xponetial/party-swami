create or replace function public.get_public_invite_by_slug(p_slug text)
returns table (
  event_id uuid,
  title text,
  event_type text,
  event_date timestamptz,
  location text,
  theme text,
  invite_copy text,
  public_slug text
)
language sql
security definer
set search_path = public
as $$
  select
    e.id as event_id,
    e.title,
    e.event_type,
    e.event_date,
    e.location,
    e.theme,
    i.invite_copy,
    i.public_slug
  from public.invites i
  join public.events e on e.id = i.event_id
  where i.public_slug = p_slug
    and i.is_public = true
  limit 1;
$$;

create or replace function public.get_public_guest_by_token(p_slug text, p_guest_token text)
returns table (
  guest_id uuid,
  event_id uuid,
  name text,
  email text,
  status text,
  plus_one_count integer,
  public_slug text
)
language sql
security definer
set search_path = public
as $$
  select
    g.id as guest_id,
    g.event_id,
    g.name,
    g.email,
    g.status,
    g.plus_one_count,
    i.public_slug
  from public.guests g
  join public.invites i on i.event_id = g.event_id
  where i.public_slug = p_slug
    and i.is_public = true
    and g.rsvp_token = p_guest_token
  limit 1;
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
begin
  if p_status not in ('pending', 'confirmed', 'declined') then
    raise exception 'Invalid RSVP status';
  end if;

  if p_plus_one_count < 0 then
    raise exception 'Plus one count cannot be negative';
  end if;

  select g.id
  into v_guest_id
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
end;
$$;

grant execute on function public.get_public_invite_by_slug(text) to anon, authenticated;
grant execute on function public.get_public_guest_by_token(text, text) to anon, authenticated;
grant execute on function public.submit_public_rsvp(text, text, text, integer) to anon, authenticated;
