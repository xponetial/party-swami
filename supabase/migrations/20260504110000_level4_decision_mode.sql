alter table public.events
add column if not exists ai_decision_mode text not null default 'approve'
check (ai_decision_mode in ('approve', 'full_auto'));
