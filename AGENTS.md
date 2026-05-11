# 🧠 Project Identity: Party Swami

This repository is **Party Swami** — an AI-powered event planning + marketplace platform.

---
This project MUST ONLY use:
- Prakash accounts and infrastructure
- Party Swami Vercel organization
- Party Swami Supabase project

Never use Nola Rate credentials or services.

## 🚨 HARD PROJECT BOUNDARY (CRITICAL)

You are working ONLY in this project.

- Root directory: `C:\Users\xpone\apps\party-swami`
- GitHub repo: https://github.com/xponetial/party-swami.git
- Production: https://partyswami.com
- Staging: https://stage.partyswami.com

### ❌ NEVER DO THIS
- Do NOT access or modify files outside this repository
- Do NOT reference or use code from **Texas Rate**
- Do NOT use Texas Rate GitHub, domains, APIs, or environment variables
- Do NOT assume shared configs across projects

If uncertain → STOP and ask.

---

## 🧭 Project Context

Party Swami is:
- AI-driven party planning platform
- Marketplace for vendors + professional planners
- Includes:
  - Invitations + RSVP system
  - AI-generated content (cards, messaging)
  - Shopping + affiliate integrations
  - Vendor marketplace + bookings
  - Budgeting + planning tools

All decisions should align with:
👉 “Marketplace + AI Planning Platform” (NOT just event planning)

---

## ⚙️ Tech Stack Assumptions

- Next.js (latest — may include breaking changes)
- Vercel deployments
- Supabase (auth + DB)
- Stripe (billing)
- Resend (email)

---

## ⚠️ Next.js Warning (MANDATORY)

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know.

This version may include breaking changes:
- APIs may differ
- File structure may differ
- Conventions may differ

Before writing or modifying code:
👉 Read relevant docs in:
`node_modules/next/dist/docs/`

Always heed deprecation warnings.
<!-- END:nextjs-agent-rules -->

---

## 🚀 Stage Deployment Rules (MANDATORY)

After any stage preview build intended for QA:

You MUST repoint the staging domain:
stage.partyswami.com → latest stage/* deployment

### Command:
npm run stage:alias

### Defaults:
- Source: current `stage/*` branch
- Target: `stage.partyswami.com`

### Optional overrides:
- `STAGE_BRANCH`
- `STAGE_SOURCE_ALIAS`
- `STAGE_DOMAIN`
- `VERCEL_SCOPE` (default: `xponetials-projects`)

---

## 🧩 Environment Isolation

This project has its own:

- `.env.local`
- API keys
- Stripe config
- Supabase config
- Vercel project

### NEVER:
- Reuse environment variables from another project
- Assume shared infrastructure
- Mix staging/production across projects

---

## 🌳 Worktree Workflow (MANDATORY)

Party Swami uses Git worktrees going forward.

- Worktree base directory: `C:\Users\xpone\apps\Worktrees`
- Setup script for new Party Swami worktrees:
  `C:\Users\xpone\apps\Worktrees\pswt.ps1`

When creating a new worktree:
- Use the `pswt.ps1` script (do not manually create ad-hoc directories)
- Keep all Party Swami worktrees under the `Worktrees` directory above
- Ensure branch naming and checkout are handled via the script defaults unless explicitly overridden

---

## 🧠 Agent Behavior Rules

Before making changes:

1. Confirm working directory is:
   `party-swami` OR an approved Party Swami worktree under:
   `C:\Users\xpone\apps\Worktrees`
2. Read:
   - `AGENTS.md`
   - `README.md`
3. Validate:
   - Git remote is correct
   - Branch is correct
   - If in a worktree, it was created via:
     `C:\Users\xpone\apps\Worktrees\pswt.ps1`

If anything is unclear → ASK.

---

## 🛑 Safety Rule

If there is ANY chance you are:
- In the wrong repo
- Using the wrong GitHub
- Mixing with Texas Rate

👉 STOP immediately and ask for clarification.

---

## ✅ Summary

You are operating inside:

👉 Party Swami ONLY  
👉 This repo ONLY  
👉 This environment ONLY  

No cross-project assumptions. Ever.
