import { execSync } from "node:child_process";

const sourceAlias =
  process.env.STAGE_SOURCE_ALIAS?.trim() ||
  "https://party-swami-git-stage-phase-1b-xponetials-projects.vercel.app";
const stageDomain = process.env.STAGE_DOMAIN?.trim() || "stage.partyswami.com";

const command = `vercel alias set ${sourceAlias} ${stageDomain}`;

console.log(`[stage-alias] ${sourceAlias} -> ${stageDomain}`);
execSync(command, { stdio: "inherit" });
