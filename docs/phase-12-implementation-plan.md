# Phase 12 Implementation Plan: Enhanced Party Questions

Branch: `phase/12-enhanced-party-questions`  
Worktree: `C:\Users\xpone\apps\Worktrees\Party_Swami_Worktree_Phase_12`  
Source PRD: `docs/phase-12-prd.rtf`

## 1) Outcome

Build a Dynamic Event Intelligence intake system that:
- Expands event setup beyond basic fields.
- Uses conditional question flows by event type.
- Produces structured AI context for Party Swami brain and downstream agents.
- Improves vendor matching, shopping relevance, and planning quality.

## 2) Scope for Phase 12

## In Scope
- Config-driven dynamic question engine (universal + event-specific + conditional).
- New storage model for event intake answers.
- API to fetch question sets and persist answers.
- AI context builder that merges base event + intake answers.
- Wiring into existing AI brain orchestration (`src/lib/ai/brain.ts`).
- Initial admin management surface (read + reorder + edit core metadata).
- Analytics for completion, drop-off, and service-intent signals.

## Out of Scope (Phase 13+)
- Fully no-code admin builder for complex nested logic.
- Autonomous vendor outreach.
- External partner marketplace integrations beyond existing flows.

## 3) Architecture Decisions

## 3.1 Config + DB Hybrid
- Keep canonical runtime schema in DB for admin flexibility.
- Seed baseline question sets from code migrations for deterministic bootstrapping.
- Add typed fallback config in `/config/event-question-configs` for local/dev resilience.

## 3.2 Feature Module Layout
- `src/features/event-intelligence/components`
- `src/features/event-intelligence/schemas`
- `src/features/event-intelligence/services`
- `src/features/event-intelligence/hooks`
- `src/features/event-intelligence/types`
- `src/lib/ai-context-builder`

## 3.3 Backward Compatibility
- Existing create-event fields remain valid.
- Dynamic intake launches behind feature flag `event_intelligence_phase12`.
- On disabled flag, app uses current `EventFormCard` flow unchanged.

## 4) Data Model Plan

Create Supabase migration with:
- `event_question_sets`
- `event_questions`
- `event_answers`

Add practical extensions for production use:
- `event_questions.is_active boolean default true`
- `event_questions.version int default 1`
- `event_answers.updated_at timestamp`
- unique index on `(event_id, question_key)` for upsert.
- index on `(event_type, section_name, display_order)`.

RLS:
- Host can read/write answers for own events.
- Admin role can manage question sets/questions.

## 5) API Plan

## Read Questions
- `GET /api/events/question-sets/[eventType]`
- Returns sections, question metadata, and condition graph.

## Save Answers
- `POST /api/events/[eventId]/answers`
- Upsert answers batch with Zod validation.

## AI Context
- `GET /api/events/[eventId]/ai-context`
- Returns merged normalized context for AI planner, shopping, vendors, timeline, budget.

## Internal Contract for Brain
- Add helper in `src/lib/ai-context-builder` used by:
  - `src/lib/ai/brain.ts`
  - `src/lib/ai/workflows.ts`

## 6) Frontend Plan

## 6.1 Intake UI
- Build `EventQuestionRenderer` for types:
  - boolean, text, number, single-select, multi-select, date, time.
- Build `ConditionalQuestionGroup` to evaluate nested conditions.
- Build `EventQuestionSection` with mobile accordion + progressive reveal.
- Add sticky save/progress on mobile.

## 6.2 Flow Integration
- Keep current event creation step minimal.
- After base event create, route to new dynamic intake step:
  - `/events/[eventId]/settings` (or new `/events/[eventId]/intake`).
- Auto-save answers (debounced + explicit save fallback).

## 7) AI Brain + Agent Plan

Use existing orchestration patterns in `src/lib/ai/brain.ts` and `src/lib/ai/agent-orchestrator.ts`.

## 7.1 New Intelligence Inputs
Expand event context with normalized keys:
- `venue.indoor_outdoor`, `venue.type`, `venue.formality`
- `guest.primary_age_group`, `guest.children_attending`, `guest.children_count`
- `food.served`, `food.catering_needed`, `food.service_style`, `food.dietary_restrictions`
- `bar.served`, `bar.open_bar`, `bar.bartender_needed`, `bar.estimated_drinkers`
- `services.requested[]`
- `ai_help.requested[]`

## 7.2 Agent Invocation Impact
- `party-planning-agent`: uses richer event constraints for plan quality.
- `budget-agent`: uses service/venue/formality modifiers.
- `shopping-recommendation-agent`: maps conditional answers to shopping bundles.
- `marketplace-vendor-agent`: maps service intents to vendor categories.
- `task-reminder-agent`: uses duration + service complexity for timeline depth.
- `invitation-card-agent`: uses formality + vibe + cultural metadata.

## 7.3 Orchestrator Changes
- Add `intake_completeness_score` to `agent_state`.
- Add `missing_context_fields[]` in one-click response.
- If critical context missing, enforce `approve` mode recommendation before full automation.

## 8) Analytics + Revenue Signals

Track events:
- `event_intake_started`
- `event_intake_section_completed`
- `event_intake_completed`
- `event_intake_abandoned`
- `event_service_intent_selected` (service category payload)
- `event_ai_help_selected`

Derived metrics:
- completion rate by event type
- top requested services
- vendor recommendation CTR uplift
- affiliate click uplift post-intake completion

## 9) Delivery Waves

## Wave 1: Foundations
- migration + tables + RLS + indexes
- Zod schemas + types
- read/save APIs
- feature flag

## Wave 2: Dynamic Intake UI
- renderer + conditional engine
- event-type question retrieval
- autosave + resume
- mobile-first interaction polish

## Wave 3: AI Brain Integration
- ai-context builder
- brain/workflow integration
- one-click payload metadata updates
- prompt/input hardening for injection-safe context assembly

## Wave 4: Marketplace + Analytics
- service intent to vendor category mapping
- affiliate trigger hooks
- analytics dashboards (existing admin analytics surface extension)

## Wave 5: Admin Controls (MVP)
- view/edit/reorder questions
- activate/deactivate questions
- basic condition editing

## 10) Testing Strategy

Unit:
- condition evaluation engine
- answer normalization
- AI context assembler

Integration:
- question set API + answer upsert API
- end-to-end intake completion and resume

Regression:
- existing create-event still works with feature flag off
- one-click AI plan remains stable when intake absent

E2E:
- representative flows:
  - Birthday with kids logic
  - Wedding with catering + bar logic
  - Memorial with cultural constraints

## 11) Risks and Mitigations

- Risk: Question sprawl hurts completion.
  - Mitigation: Progressive disclosure + required-core-only policy.
- Risk: Schema drift between DB and agents.
  - Mitigation: Single normalization layer in `ai-context-builder`.
- Risk: Low-quality admin edits.
  - Mitigation: Zod validation + preview + soft publish model (v2).

## 12) Definition of Done (Phase 12)

- Dynamic question flow live behind feature flag.
- At least 6 priority event types fully configured (Birthday, Wedding, Baby Shower, Graduation, Holiday, Memorial).
- AI context endpoint integrated in brain path.
- Vendor/shopping recommendations demonstrably use intake-derived signals.
- Analytics capture completion + intent signals.
- Stage preview QA complete; run `npm run stage:alias` after QA deploy.

## 13) Immediate Build Order (First PRs)

1. PR A: DB migration + types + schemas + feature flag scaffold.
2. PR B: Question-set read API + answer save API + tests.
3. PR C: Dynamic intake UI skeleton + conditional rendering.
4. PR D: AI context builder + brain integration + response metadata.
5. PR E: analytics + initial admin edit/reorder tooling.

