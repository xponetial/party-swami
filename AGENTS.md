<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Stage Deployment Alias Rule (Permanent)

After any stage preview build/push intended for QA, always repoint the public stage domain:

`stage.partyswami.com` -> latest `stage/*` preview deployment.

Use:

`npm run stage:alias`

By default, the script derives the source alias from the current `stage/*` branch.

Optional overrides:

- `STAGE_BRANCH` (branch name, e.g. `stage/phase-2`)
- `STAGE_SOURCE_ALIAS` (source deployment/alias URL)
- `STAGE_DOMAIN` (target domain; default `stage.partyswami.com`)
- `VERCEL_SCOPE` (default: `xponetials-projects`)
