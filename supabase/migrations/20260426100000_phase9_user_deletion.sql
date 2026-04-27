-- Phase 9: User Data Deletion & Expungement System
--
-- Stores permanent audit records of admin-initiated user deletions.
-- target_user_id is text (not uuid FK) because the auth user will be deleted;
-- the hash lets compliance correlate the record without storing PII.

create table if not exists public.user_deletion_logs (
  id uuid primary key default gen_random_uuid(),
  target_user_id text not null,
  target_email_hash text not null,
  performed_by_admin_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  steps_completed jsonb not null default '[]'::jsonb,
  error_detail text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists user_deletion_logs_admin_idx on public.user_deletion_logs(performed_by_admin_id);
create index if not exists user_deletion_logs_target_idx on public.user_deletion_logs(target_user_id);
create index if not exists user_deletion_logs_created_at_idx on public.user_deletion_logs(created_at desc);

alter table public.user_deletion_logs enable row level security;

-- No client access — all reads/writes go through the service role
drop policy if exists "user_deletion_logs_no_client_access" on public.user_deletion_logs;
create policy "user_deletion_logs_no_client_access"
on public.user_deletion_logs
for all
to authenticated
using (false)
with check (false);

-- Efficient email lookup in auth.users for the admin deletion flow.
-- Security definer runs with postgres privileges; callable by the service role only via RPC.
create or replace function public.admin_lookup_user_by_email(p_email text)
returns table (
  id uuid,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  return query
  select u.id, u.email::text, u.created_at
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
end;
$$;
