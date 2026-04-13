insert into public.feature_flags (key, label, description, enabled, rollout_percentage)
values
  ('ai_generation', 'AI generation', 'Controls all AI plan, invite copy, and shopping list generation APIs.', true, 100),
  ('upload_editing', 'Upload editing', 'Controls image upload and edit experiences for invite workflows.', true, 100),
  ('high_res_download', 'High-res download', 'Controls high-resolution download/export capabilities for paid plans.', true, 100),
  ('printing', 'Printing', 'Controls print and fulfillment integrations.', false, 0)
on conflict (key) do nothing;

