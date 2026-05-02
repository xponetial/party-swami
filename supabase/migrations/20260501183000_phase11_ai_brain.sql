alter table public.party_plans
add column if not exists budget_allocation jsonb not null default '{}'::jsonb,
add column if not exists vendor_matches jsonb not null default '[]'::jsonb,
add column if not exists required_vendor_categories jsonb not null default '[]'::jsonb,
add column if not exists complexity_score integer check (complexity_score is null or complexity_score between 0 and 100);

create table if not exists public.ai_brain_decisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  module text not null,
  decision jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_brain_decisions_event_id_idx on public.ai_brain_decisions(event_id);
create index if not exists ai_brain_decisions_module_idx on public.ai_brain_decisions(module);

alter table public.ai_brain_decisions enable row level security;

drop policy if exists "ai_brain_decisions_owner_all" on public.ai_brain_decisions;
create policy "ai_brain_decisions_owner_all"
on public.ai_brain_decisions
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = ai_brain_decisions.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = ai_brain_decisions.event_id
      and e.owner_id = auth.uid()
  )
);
