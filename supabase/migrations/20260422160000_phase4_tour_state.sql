alter table public.profiles
add column if not exists tour_state jsonb not null default '{
  "started": false,
  "completed": false,
  "skipped": false,
  "current_step": 0,
  "visited_pages": [],
  "page_tours_completed": []
}'::jsonb;

