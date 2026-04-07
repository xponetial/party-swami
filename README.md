# Party Swami

Party Swami is an AI-assisted event planning app for hosts who need one workspace for planning, invites, public RSVP, shopping, tasks, and event coordination.

## Current Product Surface

The app currently includes:

- Supabase-backed authentication, route protection, and per-host row-level security
- Event creation and a live event workspace
- Invite authoring, public RSVP links, and email delivery through Resend
- Guest management, shopping lists, tasks, and timeline views
- AI plan generation, lightweight AI rewrite flows, revision history, restore controls, and usage limits
- Dashboard summaries, AI usage telemetry, and event-level plan APIs
- Playwright smoke coverage plus CI validation

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the values you want to use locally.

Required for Supabase-backed auth and data:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Optional for real AI generation:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL_PLAN=gpt-5.4-mini
OPENAI_MODEL_LIGHTWEIGHT=gpt-5.4-nano
OPENAI_MODEL_PREMIUM=gpt-5.4
```

If `OPENAI_API_KEY` is missing, Party Swami falls back to local structured generation so the app still works in development.

Optional for invite email delivery:

```bash
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="Party Swami <onboarding@resend.dev>"
```

For production sending, replace `onboarding@resend.dev` with a verified sender in Resend. Invite email previews are uploaded to a public Supabase Storage bucket, so email delivery also requires `SUPABASE_SERVICE_ROLE_KEY`.

3. Start the app:

```bash
npm run dev
```

4. Run verification:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

## Supabase

This repo includes local Supabase migration files under [`supabase/migrations`](./supabase/migrations).

Useful commands:

```bash
npm run supabase:start
npm run supabase:stop
npm run supabase:status
npm run supabase:reset
npm run supabase:push
```

## AI Routing

Party Swami follows the app's current tiered AI routing:

- `gpt-5.4-mini` for full party-plan generation and revisions
- `gpt-5.4-nano` for lighter invite and shopping transformations
- `gpt-5.4` reserved for premium or concierge-grade workflows

AI generation metadata, request fingerprints, version history, and monthly usage rollups are persisted in Supabase.

## Testing Notes

The automated suite focuses on deterministic smoke coverage for public routes, unauthenticated API protections, and general app health.

Full automated browser-authenticated signup flows are intentionally limited because hosted auth confirmation and provider rate limits can make those flows flaky in unattended CI.
