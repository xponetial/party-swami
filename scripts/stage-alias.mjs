import { execSync } from "node:child_process";

function sanitizeBranchForAlias(branch) {
  return branch
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/-+/g, "-");
}

function getCurrentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const stageBranch = process.env.STAGE_BRANCH?.trim() || getCurrentBranch();
const isStageBranch = stageBranch.startsWith("stage/");

if (!isStageBranch) {
  throw new Error(
    `stage:alias only supports stage/* branches. Received "${stageBranch || "(unknown)"}"`,
  );
}

const sourceAlias = process.env.STAGE_SOURCE_ALIAS?.trim() || (() => {
  const branchSlug = sanitizeBranchForAlias(stageBranch);
  return `https://party-swami-git-${branchSlug}-xponetials-projects.vercel.app`;
})();
const stageDomain = process.env.STAGE_DOMAIN?.trim() || "stage.partyswami.com";
const vercelScope = process.env.VERCEL_SCOPE?.trim() || "xponetials-projects";

const command = `vercel alias set ${sourceAlias} ${stageDomain} --scope ${vercelScope}`;

console.log(`[stage-alias] branch=${stageBranch}`);
console.log(`[stage-alias] ${sourceAlias} -> ${stageDomain}`);
execSync(command, { stdio: "inherit" });
