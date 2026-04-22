update auth.users
set
  aud = 'authenticated',
  role = 'authenticated',
  email = 'marketplace.admin@partyswami.com',
  encrypted_password = extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  email_change_confirm_status = coalesce(email_change_confirm_status, 0),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
  raw_user_meta_data = '{"full_name":"Marketplace Admin"}'::jsonb,
  is_super_admin = coalesce(is_super_admin, false),
  is_sso_user = false,
  is_anonymous = false,
  updated_at = timezone('utc', now())
where id = '00000000-0000-4000-8000-000000000401';

update auth.identities
set
  identity_data = '{
    "sub": "00000000-0000-4000-8000-000000000401",
    "email": "marketplace.admin@partyswami.com",
    "email_verified": true,
    "phone_verified": false
  }'::jsonb,
  updated_at = timezone('utc', now())
where user_id = '00000000-0000-4000-8000-000000000401'
  and provider = 'email';
