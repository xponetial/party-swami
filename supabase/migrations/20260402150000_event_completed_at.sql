alter table public.events
  add column if not exists completed_at timestamptz;
