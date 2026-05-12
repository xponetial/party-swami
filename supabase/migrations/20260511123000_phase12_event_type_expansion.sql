insert into public.event_question_sets (event_type, section_name, display_order)
values
  ('bridal-shower', 'Bridal shower details', 100),
  ('diwali', 'Diwali details', 100),
  ('easter', 'Easter details', 100),
  ('eid', 'Eid details', 100),
  ('fathers-day', 'Fathers Day details', 100),
  ('halloween', 'Halloween details', 100),
  ('hanukkah', 'Hanukkah details', 100),
  ('housewarming', 'Housewarming details', 100),
  ('mothers-day', 'Mothers Day details', 100),
  ('new-year', 'New Year details', 100),
  ('pool-party', 'Pool party details', 100),
  ('st-patrick-s-day', 'St Patricks details', 100),
  ('thanksgiving', 'Thanksgiving details', 100),
  ('valentine-s-day', 'Valentines details', 100),
  ('4th-of-july', '4th of July details', 100),
  ('christmas', 'Christmas details', 110),
  ('wedding', 'Wedding vendors and decor', 110),
  ('graduation', 'Graduation planning details', 110)
on conflict do nothing;

with sets as (
  select id, event_type, section_name
  from public.event_question_sets
),
questions as (
  select * from (
    values
    ('bridal-shower', 'Bridal shower details', 'bridal_shower_brunch_or_dinner', 'Brunch or dinner?', 'single_select', false, null, null, 10, '{"options":["Brunch","Lunch","Dinner"]}'::jsonb),
    ('bridal-shower', 'Bridal shower details', 'bridal_shower_champagne_bar', 'Champagne bar?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('diwali', 'Diwali details', 'diwali_puja_setup', 'Puja setup needed?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('diwali', 'Diwali details', 'diwali_rangoli_supplies', 'Rangoli supplies needed?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('easter', 'Easter details', 'easter_egg_hunt', 'Egg hunt?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('easter', 'Easter details', 'easter_brunch_catering', 'Brunch catering?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('eid', 'Eid details', 'eid_prayer_accommodations', 'Prayer accommodations?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('eid', 'Eid details', 'eid_traditional_catering', 'Traditional catering?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('fathers-day', 'Fathers Day details', 'fathers_day_brunch_or_dinner', 'Brunch or dinner?', 'single_select', false, null, null, 10, '{"options":["Brunch","Lunch","Dinner"]}'::jsonb),
    ('fathers-day', 'Fathers Day details', 'fathers_day_outdoor_grilling', 'Outdoor grilling?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('halloween', 'Halloween details', 'halloween_kids_or_adult', 'Kid friendly or adult?', 'single_select', false, null, null, 10, '{"options":["Kid friendly","Adult","Mixed"]}'::jsonb),
    ('halloween', 'Halloween details', 'halloween_costume_contest', 'Costume contest?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('hanukkah', 'Hanukkah details', 'hanukkah_menorah_setup', 'Menorah lighting setup?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('hanukkah', 'Hanukkah details', 'hanukkah_kosher_catering', 'Kosher catering?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('housewarming', 'Housewarming details', 'housewarming_home_tour', 'Home tour planned?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('housewarming', 'Housewarming details', 'housewarming_charcuterie_setup', 'Charcuterie setup?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('mothers-day', 'Mothers Day details', 'mothers_day_brunch_or_dinner', 'Brunch or dinner?', 'single_select', false, null, null, 10, '{"options":["Brunch","Lunch","Dinner"]}'::jsonb),
    ('mothers-day', 'Mothers Day details', 'mothers_day_personalized_gifts', 'Personalized gifts?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('new-year', 'New Year details', 'new_year_countdown_setup', 'Countdown setup?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('new-year', 'New Year details', 'new_year_balloon_drop', 'Midnight balloon drop?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('pool-party', 'Pool party details', 'pool_party_lifeguard', 'Lifeguard needed?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('pool-party', 'Pool party details', 'pool_party_towel_station', 'Towel station?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('st-patrick-s-day', 'St Patricks details', 'stpatricks_live_music', 'Live music?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('st-patrick-s-day', 'St Patricks details', 'stpatricks_pub_theme', 'Pub-style theme?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('thanksgiving', 'Thanksgiving details', 'thanksgiving_friendsgiving', 'Friendsgiving format?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('thanksgiving', 'Thanksgiving details', 'thanksgiving_hosting_help', 'Need hosting support tasks?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('valentine-s-day', 'Valentines details', 'valentines_romantic_dinner', 'Romantic dinner focus?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('valentine-s-day', 'Valentines details', 'valentines_floral_delivery', 'Floral delivery?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('4th-of-july', '4th of July details', 'july4_bbq_setup', 'BBQ setup?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('4th-of-july', '4th of July details', 'july4_fireworks_viewing', 'Fireworks viewing?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('christmas', 'Christmas details', 'christmas_santa_appearance', 'Santa appearance?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('christmas', 'Christmas details', 'christmas_kids_crafts', 'Kids crafts?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('wedding', 'Wedding vendors and decor', 'wedding_preferred_colors', 'Preferred colors', 'text', false, null, null, 10, '{"maxLength":140}'::jsonb),
    ('wedding', 'Wedding vendors and decor', 'wedding_floral_style', 'Floral style', 'text', false, null, null, 20, '{"maxLength":180}'::jsonb),
    ('graduation', 'Graduation planning details', 'graduation_slideshow_setup', 'Slideshow setup?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('graduation', 'Graduation planning details', 'graduation_catering', 'Catering needed?', 'boolean', false, null, null, 20, '{}'::jsonb)
  ) as v(event_type, section_name, question_key, label, question_type, required, conditional_parent, conditional_value, display_order, metadata)
)
insert into public.event_questions (
  question_set_id,
  question_key,
  label,
  question_type,
  required,
  conditional_parent,
  conditional_value,
  display_order,
  metadata
)
select
  s.id,
  q.question_key,
  q.label,
  q.question_type,
  q.required,
  q.conditional_parent,
  q.conditional_value,
  q.display_order,
  q.metadata
from questions q
join sets s
  on s.event_type = q.event_type
 and s.section_name = q.section_name
on conflict (question_key) do nothing;
