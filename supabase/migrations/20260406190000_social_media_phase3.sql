create table if not exists public.social_media_activity_log (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.social_media_campaigns(id) on delete set null,
  content_item_id uuid references public.social_media_content_items(id) on delete set null,
  action text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists social_media_activity_campaign_idx
  on public.social_media_activity_log(campaign_id, created_at desc);

create index if not exists social_media_activity_content_idx
  on public.social_media_activity_log(content_item_id, created_at desc);

create index if not exists social_media_activity_created_idx
  on public.social_media_activity_log(created_at desc);

alter table public.social_media_activity_log enable row level security;

drop policy if exists "social_media_activity_log_no_client_access" on public.social_media_activity_log;
create policy "social_media_activity_log_no_client_access"
on public.social_media_activity_log
for all
to authenticated
using (false)
with check (false);
