# task-reminder-agent Build Note (dev)

## Skill Contract

`task-reminder-agent` converts planning context into deterministic task and reminder outputs that can be safely merged in Party Swami one-click flows.

Primary responsibilities:
- break down planning timeline/checklist into executable host tasks
- assign due labels and reminder windows
- prioritize tasks using deterministic rule ordering
- carry vendor dependency reminders when marketplace context exists

## Expected Inputs

Required:
- `event_type`
- `event_date`
- `timezone`
- planning context (`timeline`, `checklist`)

Optional:
- budget constraints
- vendor milestones/cutoffs
- RSVP/guest timing constraints

Missing required inputs should produce deterministic fallback output with empty arrays and explicit `notes` about missing fields.

## Expected Outputs

Stable top-level shape:
- `tasks`: ordered array
- `reminders`: ordered array
- `summary`: short deterministic summary string/object
- `notes`: assumptions or missing-data flags

Task fields:
- `id`
- `title`
- `phase` (`now | soon | week_of | day_of | post_event`)
- `due_label`
- `priority` (`high | medium | low`)
- `depends_on`

Reminder fields:
- `task_id`
- `send_window`
- `priority`
- `reason`

## Deterministic Guardrails

- no invented absolute dates without input anchors
- stable sort order (`phase` > `priority` > `due_label` > `id`)
- duplicate collapse for semantically equivalent tasks
- rule-based priority only (deadline proximity, dependency criticality, guest/vendor impact)
- no extra output keys beyond contract
- concise, execution-focused wording

## Mapped Code Wiring Points

Per strategy wiring contract and assignment map:
- primary runtime integration: `timeline/task synchronization` in `src/lib/ai/workflows.ts`
- orchestration path: `src/lib/ai/brain.ts` via `brain-orchestrator` policy layer
- one-click/plan-event entry points that consume merged outputs:
  - `src/app/api/ai/one-click/route.ts`
  - `src/app/api/ai/plan-event/route.ts`

Assignment reference alignment:
- agent id: `task-reminder-agent`
- skills: `task-breakdown`, `deadline-calculation`, `priority-assignment`
  (from `docs/strategy/agent-skill-assignment.yaml`)
