alter table public.marketplace_reviews
add column if not exists provider_response text,
add column if not exists provider_responded_at timestamptz,
add column if not exists provider_response_updated_at timestamptz;

drop policy if exists "marketplace_reviews_vendor_owner_update_response" on public.marketplace_reviews;
create policy "marketplace_reviews_vendor_owner_update_response"
on public.marketplace_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.vendors v
    where v.id = marketplace_reviews.vendor_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vendors v
    where v.id = marketplace_reviews.vendor_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists "marketplace_reviews_planner_owner_update_response" on public.marketplace_reviews;
create policy "marketplace_reviews_planner_owner_update_response"
on public.marketplace_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.planners p
    where p.id = marketplace_reviews.planner_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.planners p
    where p.id = marketplace_reviews.planner_id
      and p.owner_id = auth.uid()
  )
);
