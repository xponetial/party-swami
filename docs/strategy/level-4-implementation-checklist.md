# Level 4 Implementation Checklist

## Goal

Upgrade Party Swami from orchestrated multi-module behavior to a true **Agent Ecosystem (Level 4)** with real inter-agent collaboration, shared state, dynamic replanning, and measurable agent quality.

## Definition Of Done (Level 4)

1. Agents collaborate through shared state and handoff rules.
2. Budget/vendor/shopping/timeline decisions can influence each other in the same run.
3. Replanning triggers run automatically on key event changes.
4. User can choose `approve` vs `full_auto` decision mode.
5. Every invoked agent has persisted, auditable outputs.
6. Agent-level quality and handoff metrics are captured and queryable.

## Ticket Plan

### L4-001: Shared Agent State Contract
- **Outcome**: Add a canonical event agent state object.
- **Files**:
  - `src/lib/ai/agent-orchestrator.ts`
  - `src/lib/ai/brain.ts`
  - `src/lib/events.ts`
- **API/DB touchpoints**:
  - `party_plans.raw_response.ai_brain`
- **Tasks**:
  1. Define `agent_state` schema (inputs, derived fields, constraints).
  2. Persist `agent_state` in `raw_response.ai_brain`.
  3. Expose `agent_state` through event plan API.
- **Acceptance**:
  - A one-click run stores and returns valid `agent_state`.

### L4-002: Inter-Agent Handoff Engine
- **Outcome**: Agents consume upstream agent outputs with deterministic merge order.
- **Files**:
  - `src/lib/ai/brain.ts`
  - `src/lib/ai/agent-orchestrator.ts`
- **Tasks**:
  1. Add explicit handoff graph: planning -> budget/shopping/vendor/task/invite -> merge.
  2. Add conflict strategy (budget constraint wins, vendor fallback rules, etc.).
  3. Add per-agent `input_snapshot` and `output_snapshot` into decision logs.
- **Acceptance**:
  - `ai_brain_decisions` includes handoff evidence for each invoked agent.

### L4-003: Budget-Constrained Shopping + Vendor Refinement
- **Outcome**: Budget agent actively tunes shopping and vendor selections.
- **Files**:
  - `src/lib/ai/brain.ts`
  - `src/app/api/ai/budget/route.ts`
  - `src/app/api/ai/shopping/route.ts`
  - `src/app/api/ai/vendors/route.ts`
- **Tasks**:
  1. Add budget envelope to shopping/vendor generation.
  2. Re-rank or replace items/vendors when projected spend exceeds thresholds.
  3. Persist adjustment rationale.
- **Acceptance**:
  - Over-budget events show applied substitutions with rationale.

### L4-004: Dynamic Replanning Triggers
- **Outcome**: Automatic replan when event context materially changes.
- **Files**:
  - `src/lib/ai/brain.ts`
  - `src/lib/events.ts`
  - `src/app/api/ai/one-click/route.ts`
  - `src/app/api/ai/plan-event/route.ts`
- **Tasks**:
  1. Detect trigger deltas (budget/date/location/guest count/theme).
  2. Re-run impacted agents only.
  3. Store `replan_reason` and changed sections.
- **Acceptance**:
  - Updating event budget/date triggers selective agent recomputation.

### L4-005: Approval Mode vs Full Auto Mode
- **Outcome**: User-level decision controls for agent actions.
- **Files**:
  - `src/app/events/[eventId]/settings/page.tsx`
  - `src/app/api/ai/one-click/route.ts`
  - `src/lib/ai/brain.ts`
- **Tasks**:
  1. Add `decision_mode` (`approve` | `full_auto`) in event/plan metadata.
  2. In `approve`, produce proposed actions and require user confirmation.
  3. In `full_auto`, apply safe class actions automatically.
- **Acceptance**:
  - Mode switch changes execution behavior and output format.

### L4-006: Persisted Outputs For Vendor Onboarding + Growth Agents
- **Outcome**: Non-event-core agents produce stored artifacts.
- **Files**:
  - `src/lib/ai/agent-orchestrator.ts`
  - `src/lib/ai/brain.ts`
  - `src/lib/admin.ts`
  - `src/app/events/[eventId]/settings/page.tsx`
- **DB touchpoints**:
  - Add storage location in `raw_response.ai_brain` or dedicated tables.
- **Tasks**:
  1. Define output schema for `vendor-onboarding-agent`.
  2. Define output schema for `social-media-agent` and `admin-growth-agent`.
  3. Render summaries in settings/admin.
- **Acceptance**:
  - These agents have verifiable persisted artifacts per run.

### L4-007: Agent Quality + Handoff Metrics
- **Outcome**: Agent-level observability.
- **Files**:
  - `src/lib/ai/brain.ts`
  - `src/lib/admin.ts`
  - `src/app/events/[eventId]/settings/page.tsx`
- **Tasks**:
  1. Log quality metrics per agent (`latency`, `status`, `adjustment_count`, `acceptance_signal`).
  2. Add admin aggregation views.
  3. Add event-level quality card.
- **Acceptance**:
  - Metrics are queryable and visible for QA.

### L4-008: Level 4 Test Suite
- **Outcome**: Automated confidence for agent ecosystem behavior.
- **Files**:
  - `tests/` (new e2e/integration specs)
  - `src/lib/ai/brain.ts` (test helpers if needed)
- **Tasks**:
  1. Add scenario tests: budget overrun, vendor scarcity, guest count surge.
  2. Assert invoked/standby correctness + output consistency.
  3. Assert mode behavior (`approve` vs `full_auto`).
- **Acceptance**:
  - Tests fail on handoff regressions and pass on expected orchestration.

## Parallel Execution Plan

### Track A (Core brain mechanics)
- L4-001, L4-002, L4-004

### Track B (Decision quality)
- L4-003, L4-007

### Track C (Control + UI)
- L4-005

### Track D (Agent artifact completeness)
- L4-006

### Track E (Validation)
- L4-008

## Recommended Build Order

1. L4-001
2. L4-002
3. L4-003 + L4-004 (parallel)
4. L4-005 + L4-006 (parallel)
5. L4-007
6. L4-008

## Stage QA Exit Criteria

1. Anniversary + birthday + wedding test events pass orchestration checks.
2. `agent_invocations` plus `agent_state` are present and valid.
3. At least one replanning scenario confirmed in stage.
4. No critical regressions in one-click plan generation.
