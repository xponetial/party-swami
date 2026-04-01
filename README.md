# PartyGenie

PartyGenie is a browser-based AI-powered party planning app built milestone by milestone from the PartyGenie Codex Build Brief.

## Milestone 1

This repository currently includes:

- Next.js App Router + TypeScript + Tailwind v4 foundation
- Marketing, auth, dashboard, event, and API route shells
- Shared UI primitives and app shell layout
- Supabase browser, server, and middleware helper scaffolding
- Environment variable template for upcoming integrations

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in required values as integrations are wired up.

For real AI generation, add:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5
```

If `OPENAI_API_KEY` is missing, PartyGenie falls back to the local structured planner so the app still works during development.

For invite email delivery, add:

```bash
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="PartyGenie <onboarding@resend.dev>"
```

For production sending, replace `onboarding@resend.dev` with a verified domain sender in Resend.

3. Start the development server:

```bash
npm run dev
```

4. Run checks:

```bash
npm run lint
npm run typecheck
```

## Upcoming Milestones

- Milestone 2: Supabase auth, schema, event persistence, and route protection
- Milestone 3: Structured AI planning and editable outputs
- Milestone 4: Invite flows, guests, and public RSVP
- Milestone 5: Shopping, tasks, analytics, and dashboard depth
- Milestone 6: Security hardening, QA, and beta launch readiness
