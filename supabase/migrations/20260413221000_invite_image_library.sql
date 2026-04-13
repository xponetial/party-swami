create table if not exists public.invite_generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  invite_id uuid references public.invites(id) on delete set null,
  status text not null check (status in ('option', 'finalized')),
  storage_path text not null unique,
  public_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  estimated_cost_usd numeric(10, 6) not null default 0,
  prompt_excerpt text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists invite_generated_images_user_id_created_at_idx
  on public.invite_generated_images(user_id, created_at desc);

create index if not exists invite_generated_images_user_id_status_idx
  on public.invite_generated_images(user_id, status);

drop trigger if exists set_invite_generated_images_updated_at on public.invite_generated_images;
create trigger set_invite_generated_images_updated_at
before update on public.invite_generated_images
for each row
execute function public.set_updated_at();

alter table public.invite_generated_images enable row level security;

drop policy if exists "invite_generated_images_owner_all" on public.invite_generated_images;
create policy "invite_generated_images_owner_all"
on public.invite_generated_images
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

