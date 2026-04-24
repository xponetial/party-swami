update auth.users
set
  encrypted_password = extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf')),
  recovery_token = '',
  updated_at = timezone('utc', now())
where id = '00000000-0000-4000-8000-000000000401';
