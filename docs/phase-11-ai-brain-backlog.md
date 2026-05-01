# Phase 11 - Party Swami AI Brain Backlog

Branch: `phase/11-ai-brain`  
Worktree: `C:\Users\xpone\apps\Worktrees\Party_Swami_Worktree_Phase_11`

## Objective
Build the Stage 3 "AI Brain" as Party Swami's core execution engine:
- Input event context
- Produce structured plan
- Generate shopping + vendor + timeline + budget outputs
- Power "1-Click Party"

This phase is aligned to the long-term evolution goal from Level 3 to Level 5, while focusing execution on Phase 1 to Phase 3 outcomes (revenue-first path).

## Source Alignment
- `Party Swami AI Brain.docx`: Defines core AI engine modules, API shape, scoring logic, and MVP sequencing.
- `Party Swami Evolution.docx`: Defines staged evolution (Level 3 -> 5) and recommends immediate focus on execution engine + marketplace foundation + early agentic behavior.

## Phase 11 Scope (Build Now)
## 1) AI Brain Domain Model
- Define canonical `EventContext` input schema:
  - `event_type`, `theme`, `guest_count`, `budget`, `location`, `venue_type`, `date`, `preferences`
- Define canonical AI outputs:
  - `timeline[]`
  - `shopping_list[]`
  - `vendor_matches[]`
  - `budget_allocation{}`
  - `complexity_score`
- Add TypeScript types + zod validation for all request/response models.

## 2) AI Brain API Surface
- Implement endpoints (or route handlers) for:
  - `POST /api/ai/plan-event`
  - `POST /api/ai/shopping`
  - `POST /api/ai/vendors`
  - `POST /api/ai/budget`
  - `POST /api/ai/one-click`
- Guarantee deterministic response envelopes with `event_id`, `plan_version`, `generated_at`.

## 3) Core Decision Modules
- Event Planner Engine:
  - Orchestrates all modules and returns full plan object.
- Budget Allocator:
  - Start with baseline split:
    - decor 20%
    - food 30%
    - entertainment 30%
    - misc 20%
  - Add modifiers for event type, guest count, venue type.
- Shopping Generator:
  - Build category-first list and assign `must_have`, `recommended`, `optional` priorities.
- Vendor Matching:
  - Implement score formula:
    - `(rating * 0.4) + (price_fit * 0.3) + (distance * 0.2) + (availability * 0.1)`
  - Return ranked and normalized recommendations.
- Timeline Generator:
  - Generate T-minus tasks (T-14, T-7, T-1, Day-of) based on event date and complexity.

## 4) One-Click Party Orchestration
- `POST /api/ai/one-click` orchestrates:
  - plan generation
  - shopping output
  - vendor matches
  - merged response payload for UI rendering
- Add idempotency support with `event_id` and optional `request_id`.

## 5) Non-Functional Requirements
- Response target: under 3 seconds for default event size.
- Stateless APIs (no in-memory session dependence).
- Structured logging for AI decisions and scoring.
- Retry/fallback behavior for partial submodule failure.

## 6) UI Integration Contract
- "Plan My Party" triggers `/api/ai/one-click`.
- Results page sections:
  - Plan Overview
  - Shopping List
  - Vendor Recommendations
- Include affordances for:
  - Add-all-to-cart workflow
  - Recommended vendor badges
  - Budget visibility by category

## 7) Feedback + Quality Loop
- Capture user feedback signals:
  - accepted/rejected vendor
  - shopping item removals
  - budget edits
- Store per-module quality metrics for later ranking improvements.

## Out of Scope (For Later Phases)
- Autonomous vendor outreach/booking.
- Multi-agent orchestration roles (design/shopping/timeline/budget/vendor agents).
- Self-improving software factory automation.

## Implementation Plan (Suggested Sequence)
1. Create `ai-brain` domain types + validation schemas.
2. Implement budget + timeline pure functions with tests.
3. Implement shopping generator with priority logic + tests.
4. Implement vendor scoring service with seeded input + tests.
5. Implement `/api/ai/plan-event` orchestration.
6. Implement `/api/ai/one-click` aggregation endpoint.
7. Wire "Plan My Party" UI to one-click endpoint.
8. Add structured logging, latency metrics, and error handling.

## Acceptance Criteria
- A valid event payload returns a complete structured plan.
- Each endpoint returns stable, documented JSON contracts.
- Vendor list is rank-ordered by score and includes rationale fields.
- Shopping list items include category + priority.
- Timeline includes date-relative execution tasks.
- Budget allocations always sum to total budget.
- One-click response can render all key UI sections with no extra calls.

## Initial Technical Tasks
- Add `docs/ai-brain-api-contract.md` with request/response examples.
- Add `lib/ai-brain/` module boundary:
  - `planner.ts`
  - `budget.ts`
  - `shopping.ts`
  - `vendors.ts`
  - `timeline.ts`
  - `types.ts`
- Add route handlers under `app/api/ai/`.
- Add tests for each module and orchestration route.

## Stage Deployment Reminder
After QA preview push for this phase:
- run `npm run stage:alias`
- ensure `stage.partyswami.com` points to latest `stage/*` preview deployment.
