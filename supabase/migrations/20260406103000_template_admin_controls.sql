create table if not exists public.template_admin_controls (
  id uuid primary key default gen_random_uuid(),
  pack_slug text not null,
  template_id text not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (pack_slug, template_id)
);

create index if not exists template_admin_controls_pack_slug_idx
  on public.template_admin_controls(pack_slug);

create index if not exists template_admin_controls_is_active_idx
  on public.template_admin_controls(is_active);

drop trigger if exists set_template_admin_controls_updated_at on public.template_admin_controls;
create trigger set_template_admin_controls_updated_at
before update on public.template_admin_controls
for each row
execute function public.set_updated_at();

alter table public.template_admin_controls enable row level security;

drop policy if exists "template_admin_controls_no_client_access" on public.template_admin_controls;
create policy "template_admin_controls_no_client_access"
on public.template_admin_controls
for all
to authenticated
using (false)
with check (false);
