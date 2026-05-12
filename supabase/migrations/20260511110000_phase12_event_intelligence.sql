create table if not exists public.event_question_sets (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  section_name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_questions (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references public.event_question_sets(id) on delete cascade,
  question_key text not null unique,
  label text not null,
  description text,
  question_type text not null check (question_type in ('boolean', 'text', 'number', 'single_select', 'multi_select', 'date', 'time')),
  placeholder text,
  required boolean not null default false,
  conditional_parent text,
  conditional_value text,
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_answers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  question_key text not null,
  answer jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists event_answers_event_question_unique
  on public.event_answers(event_id, question_key);

create index if not exists event_question_sets_event_type_order_idx
  on public.event_question_sets(event_type, display_order);

create index if not exists event_questions_set_order_idx
  on public.event_questions(question_set_id, display_order);

create index if not exists event_questions_conditional_parent_idx
  on public.event_questions(conditional_parent);

create index if not exists event_answers_event_id_idx
  on public.event_answers(event_id);

drop trigger if exists set_event_answers_updated_at on public.event_answers;
create trigger set_event_answers_updated_at
before update on public.event_answers
for each row
execute function public.set_updated_at();

alter table public.event_question_sets enable row level security;
alter table public.event_questions enable row level security;
alter table public.event_answers enable row level security;

drop policy if exists "event_question_sets_authenticated_read" on public.event_question_sets;
create policy "event_question_sets_authenticated_read"
on public.event_question_sets
for select
to authenticated
using (true);

drop policy if exists "event_question_sets_no_client_write" on public.event_question_sets;
create policy "event_question_sets_no_client_write"
on public.event_question_sets
for all
to authenticated
using (false)
with check (false);

drop policy if exists "event_questions_authenticated_read" on public.event_questions;
create policy "event_questions_authenticated_read"
on public.event_questions
for select
to authenticated
using (is_active = true);

drop policy if exists "event_questions_no_client_write" on public.event_questions;
create policy "event_questions_no_client_write"
on public.event_questions
for all
to authenticated
using (false)
with check (false);

drop policy if exists "event_answers_owner_select" on public.event_answers;
create policy "event_answers_owner_select"
on public.event_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_answers.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "event_answers_owner_insert" on public.event_answers;
create policy "event_answers_owner_insert"
on public.event_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_answers.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "event_answers_owner_update" on public.event_answers;
create policy "event_answers_owner_update"
on public.event_answers
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_answers.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_answers.event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "event_answers_owner_delete" on public.event_answers;
create policy "event_answers_owner_delete"
on public.event_answers
for delete
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_answers.event_id
      and e.owner_id = auth.uid()
  )
);

insert into public.feature_flags (key, label, description, enabled, rollout_percentage)
values (
  'event_intelligence_phase12',
  'Event intelligence intake',
  'Enables dynamic event-intelligence intake and conditional question flow.',
  false,
  0
)
on conflict (key) do nothing;

insert into public.event_question_sets (event_type, section_name, display_order)
values
  ('universal', 'Venue and setup', 10),
  ('universal', 'Guest intelligence', 20),
  ('universal', 'Food and beverage', 30),
  ('universal', 'Services', 40),
  ('universal', 'AI assistance', 50),
  ('birthday', 'Birthday details', 100),
  ('wedding', 'Ceremony and reception', 100),
  ('baby-shower', 'Shower details', 100),
  ('graduation', 'Graduation details', 100),
  ('christmas', 'Holiday details', 100),
  ('sympathy', 'Memorial details', 100)
on conflict do nothing;

with sets as (
  select id, event_type, section_name
  from public.event_question_sets
),
questions as (
  select * from (
    values
    ('universal', 'Venue and setup', 'venue_indoor_outdoor', 'Indoor, outdoor, or mixed?', 'single_select', true, null, null, 10, '{"options":["Indoor","Outdoor","Mixed"]}'::jsonb),
    ('universal', 'Venue and setup', 'venue_type', 'Venue type', 'single_select', true, null, null, 20, '{"options":["Home","Rented venue","Restaurant","Park","Beach","Backyard","Banquet hall","Church","Hotel","Other"]}'::jsonb),
    ('universal', 'Venue and setup', 'event_duration_hours', 'Estimated event duration (hours)', 'number', false, null, null, 30, '{"min":1,"max":24}'::jsonb),
    ('universal', 'Venue and setup', 'formality_level', 'Formality level', 'single_select', false, null, null, 40, '{"options":["Casual","Semi formal","Formal","Luxury"]}'::jsonb),
    ('universal', 'Guest intelligence', 'primary_age_group', 'Primary age group', 'single_select', false, null, null, 10, '{"options":["Kids","Teens","Adults","Mixed"]}'::jsonb),
    ('universal', 'Guest intelligence', 'children_attending', 'Will children attend?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('universal', 'Guest intelligence', 'children_count', 'Number of children', 'number', false, 'children_attending', 'true', 30, '{"min":1,"max":500}'::jsonb),
    ('universal', 'Guest intelligence', 'children_age_ranges', 'Age ranges for children', 'multi_select', false, 'children_attending', 'true', 40, '{"options":["0-2","3-5","6-9","10-12","13-17"]}'::jsonb),
    ('universal', 'Guest intelligence', 'accessibility_requirements', 'Accessibility requirements', 'multi_select', false, null, null, 50, '{"options":["Wheelchair access","Elderly accommodations","ADA access","Quiet areas","None"]}'::jsonb),
    ('universal', 'Food and beverage', 'food_served', 'Will food be served?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('universal', 'Food and beverage', 'catering_needed', 'Catering needed?', 'boolean', false, 'food_served', 'true', 20, '{}'::jsonb),
    ('universal', 'Food and beverage', 'food_service_style', 'Buffet or plated?', 'single_select', false, 'food_served', 'true', 30, '{"options":["Buffet","Plated","Family style","Stations"]}'::jsonb),
    ('universal', 'Food and beverage', 'cuisine_preferences', 'Cuisine preferences', 'multi_select', false, 'food_served', 'true', 40, '{"options":["American","Italian","Mexican","Indian","Mediterranean","BBQ","Seafood","Fusion"]}'::jsonb),
    ('universal', 'Food and beverage', 'alcohol_served', 'Will alcohol be served?', 'boolean', false, null, null, 50, '{}'::jsonb),
    ('universal', 'Food and beverage', 'open_bar', 'Open bar?', 'boolean', false, 'alcohol_served', 'true', 60, '{}'::jsonb),
    ('universal', 'Food and beverage', 'byob', 'BYOB?', 'boolean', false, 'alcohol_served', 'true', 70, '{}'::jsonb),
    ('universal', 'Food and beverage', 'bartender_needed', 'Bartender needed?', 'boolean', false, 'alcohol_served', 'true', 80, '{}'::jsonb),
    ('universal', 'Food and beverage', 'signature_drinks', 'Signature drinks?', 'boolean', false, 'alcohol_served', 'true', 90, '{}'::jsonb),
    ('universal', 'Food and beverage', 'estimated_drinkers', 'Estimated drinkers', 'number', false, 'alcohol_served', 'true', 100, '{"min":1,"max":2000}'::jsonb),
    ('universal', 'Food and beverage', 'dietary_restrictions', 'Dietary restrictions', 'multi_select', false, null, null, 110, '{"options":["Vegetarian","Vegan","Gluten free","Nut allergies","Halal","Kosher","Dairy free"]}'::jsonb),
    ('universal', 'Services', 'services_requested', 'Which services would you like help with?', 'multi_select', false, null, null, 10, '{"options":["Catering","Bakery","Photographer","Videographer","DJ","Live music","Decorator","Florist","Venue","Bartender","Rentals","Party planner","Cleaning service","Transportation","Security","Valet"]}'::jsonb),
    ('universal', 'AI assistance', 'ai_help_requested', 'What help would you like from Party Swami?', 'multi_select', false, null, null, 10, '{"options":["AI planning","Shopping recommendations","Vendor recommendations","Budget planning","Timeline creation","RSVP management","Seating charts","Decor inspiration","Menu planning","Entertainment ideas","Full event planning"]}'::jsonb),
    ('birthday', 'Birthday details', 'birthday_age', 'Age being celebrated', 'number', false, null, null, 10, '{"min":1,"max":120}'::jsonb),
    ('birthday', 'Birthday details', 'birthday_surprise', 'Surprise party?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('birthday', 'Birthday details', 'birthday_milestone', 'Milestone birthday?', 'boolean', false, null, null, 30, '{}'::jsonb),
    ('birthday', 'Birthday details', 'birthday_character_interests', 'Character or interest themes', 'text', false, null, null, 40, '{"maxLength":240}'::jsonb),
    ('wedding', 'Ceremony and reception', 'wedding_ceremony_reception', 'Ceremony and reception?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('wedding', 'Ceremony and reception', 'wedding_party_size', 'Bridal party size', 'number', false, null, null, 20, '{"min":0,"max":50}'::jsonb),
    ('wedding', 'Ceremony and reception', 'wedding_religious_traditions', 'Religious traditions', 'text', false, null, null, 30, '{"maxLength":240}'::jsonb),
    ('wedding', 'Ceremony and reception', 'wedding_dj_or_band', 'DJ or live band?', 'single_select', false, null, null, 40, '{"options":["DJ","Live band","Both","Not needed"]}'::jsonb),
    ('baby-shower', 'Shower details', 'baby_shower_gender_reveal', 'Gender reveal included?', 'boolean', false, null, null, 10, '{}'::jsonb),
    ('baby-shower', 'Shower details', 'baby_shower_registry', 'Registry integration needed?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('baby-shower', 'Shower details', 'baby_shower_games', 'Games planned?', 'boolean', false, null, null, 30, '{}'::jsonb),
    ('graduation', 'Graduation details', 'graduation_school_colors', 'School colors', 'text', false, null, null, 10, '{"maxLength":120}'::jsonb),
    ('graduation', 'Graduation details', 'graduation_open_house', 'Open house format?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('graduation', 'Graduation details', 'graduation_photo_booth', 'Photo booth needed?', 'boolean', false, null, null, 30, '{}'::jsonb),
    ('christmas', 'Holiday details', 'holiday_family_or_corporate', 'Family or corporate?', 'single_select', false, null, null, 10, '{"options":["Family","Corporate","Mixed"]}'::jsonb),
    ('christmas', 'Holiday details', 'holiday_secret_santa', 'Secret Santa?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('christmas', 'Holiday details', 'holiday_gift_budget', 'Gift exchange budget', 'number', false, 'holiday_secret_santa', 'true', 30, '{"min":0,"max":10000}'::jsonb),
    ('sympathy', 'Memorial details', 'memorial_religious_traditions', 'Religious traditions?', 'text', false, null, null, 10, '{"maxLength":300}'::jsonb),
    ('sympathy', 'Memorial details', 'memorial_slideshow', 'Memory slideshow?', 'boolean', false, null, null, 20, '{}'::jsonb),
    ('sympathy', 'Memorial details', 'memorial_livestream', 'Livestream setup?', 'boolean', false, null, null, 30, '{}'::jsonb)
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
