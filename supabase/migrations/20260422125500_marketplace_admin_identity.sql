insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000401',
  '{
    "sub": "00000000-0000-4000-8000-000000000401",
    "email": "marketplace.admin@partyswami.com",
    "email_verified": true,
    "phone_verified": false
  }'::jsonb,
  'email',
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (provider_id, provider) do update
set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = timezone('utc', now());
