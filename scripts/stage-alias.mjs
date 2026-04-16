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
const sourceAlias = process.env.STAGE_SOURCE_ALIAS?.trim() || (() => {
  if (!stageBranch.startsWith("stage/")) {
    throw new Error(
      `stage:alias requires STAGE_SOURCE_ALIAS outside stage/* branches. Received branch "${stageBranch || "(unknown)"}"`,
    );
  }

  const branchSlug = sanitizeBranchForAlias(stageBranch);
  return `https://party-swami-git-${branchSlug}-xponetials-projects.vercel.app`;
})();

if (!sourceAlias.includes("-git-stage-")) {
  throw new Error(
    `stage:alias refused non-stage source alias: "${sourceAlias}"`,
  );
}
const stageDomain = process.env.STAGE_DOMAIN?.trim() || "stage.partyswami.com";
const vercelScope = process.env.VERCEL_SCOPE?.trim() || "xponetials-projects";

const command = `vercel alias set ${sourceAlias} ${stageDomain} --scope ${vercelScope}`;

console.log(`[stage-alias] branch=${stageBranch}`);
console.log(`[stage-alias] ${sourceAlias} -> ${stageDomain}`);
execSync(command, { stdio: "inherit" });
