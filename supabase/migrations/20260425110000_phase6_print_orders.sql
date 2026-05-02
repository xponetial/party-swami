create table if not exists public.print_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  card_id uuid references public.invites(id) on delete set null,
  provider text not null default 'walgreens',
  product_code text not null,
  store_id text not null,
  quantity integer not null check (quantity > 0),
  external_order_id text,
  status text not null default 'created' check (
    status in ('created', 'submitted', 'processing', 'ready', 'completed', 'cancelled', 'failed')
  ),
  customer_first_name text,
  customer_last_name text,
  customer_email text,
  customer_phone text,
  image_url text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists print_orders_user_id_idx on public.print_orders(user_id);
create index if not exists print_orders_event_id_idx on public.print_orders(event_id);
create index if not exists print_orders_external_order_id_idx on public.print_orders(external_order_id);
create index if not exists print_orders_status_idx on public.print_orders(status);

alter table public.print_orders enable row level security;

drop trigger if exists set_print_orders_updated_at on public.print_orders;
create trigger set_print_orders_updated_at
before update on public.print_orders
for each row
execute function public.set_updated_at();

drop policy if exists "print_orders_owner_all" on public.print_orders;
create policy "print_orders_owner_all"
on public.print_orders
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
