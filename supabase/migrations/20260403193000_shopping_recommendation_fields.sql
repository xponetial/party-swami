alter table public.shopping_items
add column if not exists recommendation_reason text,
add column if not exists search_query text,
add column if not exists image_url text;
