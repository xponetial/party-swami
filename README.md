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

Optional for Amazon affiliate attribution in shopping handoff redirects:

```bash
AMAZON_ASSOCIATE_TAG=partyswami-20
```

If this is set, Amazon outbound shopping links routed through `/api/affiliate/click` will include `tag=<your_store_id>`. Keep this unset in environments where you do not want affiliate tagging enabled.
During shopping generation and replacement, Party Swami attempts to resolve recommendation queries to real Amazon product detail URLs. If that resolution fails for an item, it falls back to the Amazon search URL for that query.

Optional for stable Amazon product images (recommended in stage):

```bash
AMAZON_IMAGE_PROVIDER=rainforest
RAINFOREST_API_KEY=your_rainforest_api_key
AMAZON_IMAGE_PROVIDER_AMAZON_DOMAIN=amazon.com
```

When enabled, Party Swami uses the provider to fetch product image URLs by ASIN and falls back to direct Amazon scraping only if provider data is unavailable.

Optional for invite email delivery:

```bash
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="Party Swami <noreply@email.partyswami.com>"
```

Invite email previews are uploaded to a public Supabase Storage bucket, so email delivery also requires `SUPABASE_SERVICE_ROLE_KEY`.

Optional for Stripe billing (phase 2 premium tier):

```bash
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID_PRO_MONTHLY=your_stripe_pro_monthly_price_id
```

These power the upgrade checkout route and Stripe webhook sync that updates `profiles.plan_tier` automatically.

Optional for the structured contact and feedback form:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

The phase 3 contact form uses Cloudflare Turnstile for server-verified spam protection. If these keys are missing, direct inbox links still work, but the structured form will stay disabled.

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

## Branch Promotion Workflow

Use this branch flow for all new work:

1. Start implementation on `dev` or a Party Swami worktree feature branch.
2. Promote QA-ready changes to a `stage/*` branch.
3. Repoint stage to the latest `stage/*` deployment:

```bash
npm run stage:alias
```

4. After QA signoff, merge to `main` for production.

To enforce this locally, install repo hooks once:

```bash
npm run hooks:install
```

This enables a pre-commit policy that blocks direct commits on `main`.

## Stage Domain Alias

After deploying preview builds from any `stage/*` branch, repoint the stage domain to the latest stage preview:

```bash
npm run stage:alias
```

Optional overrides:

- `STAGE_BRANCH` to choose which `stage/*` branch alias to point from
- `STAGE_SOURCE_ALIAS` to override source deployment/alias URL
- `STAGE_DOMAIN` to override target domain (default: `stage.partyswami.com`)
- `VERCEL_SCOPE` to override Vercel scope/team (default: `xponetials-projects`)

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

## Remote E2E (Stage + Production)

This repo includes a reusable remote Playwright suite for authenticated end-to-end checks on:

- `https://stage.partyswami.com`
- `https://partyswami.com`

It captures:

- pass/fail status by test
- observed request timings
- slow request counts (threshold default `4000ms`)
- browser runtime errors (request failures, page errors, console errors)

Run:

```bash
npm run test:e2e:remote:stage
npm run test:e2e:remote:prod
# or both
npm run test:e2e:remote
```

One-time auth bootstrapping per environment:

1. The setup project opens `/login` and clicks **Continue with Google**.
2. Complete Google auth manually using your Party Swami account.
3. On successful redirect to `/dashboard`, Playwright saves session state:
   - `playwright/.auth/stage-user.json`
   - `playwright/.auth/prod-user.json`

Generated report:

- `test-results/remote-e2e-summary.md`
