do $$
declare
  marketplace_admin_id uuid := '00000000-0000-4000-8000-000000000401';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    marketplace_admin_id,
    'authenticated',
    'authenticated',
    'marketplace.admin@partyswami.com',
    null,
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Marketplace Admin"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update
  set
    email = excluded.email,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = timezone('utc', now());

  insert into public.profiles (id, full_name, plan_tier)
  values (marketplace_admin_id, 'Marketplace Admin', 'admin')
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    plan_tier = 'admin',
    updated_at = timezone('utc', now());
end $$;
