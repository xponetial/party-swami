update storage.buckets
set
  file_size_limit = 26214400,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'invite-previews';

