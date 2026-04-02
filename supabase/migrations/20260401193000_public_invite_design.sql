drop function if exists public.get_public_invite_by_slug(text);

create or replace function public.get_public_invite_by_slug(p_slug text)
returns table (
  event_id uuid,
  title text,
  event_type text,
  event_date timestamptz,
  location text,
  theme text,
  invite_copy text,
  design_json jsonb,
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
    i.design_json,
    i.public_slug
  from public.invites i
  join public.events e on e.id = i.event_id
  where i.public_slug = p_slug
    and i.is_public = true
  limit 1;
$$;

grant execute on function public.get_public_invite_by_slug(text) to anon, authenticated;
