import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

function getVercelToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const appData = process.env.APPDATA || join(process.env.HOME || "~", ".config");
  const authPath = join(appData, "com.vercel.cli", "Data", "auth.json");
  try {
    const auth = JSON.parse(readFileSync(authPath, "utf8"));
    return auth.token ?? null;
  } catch {
    return null;
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

const stageDomain = process.env.STAGE_DOMAIN?.trim() || "stage.partyswami.com";
const vercelScope = process.env.VERCEL_SCOPE?.trim() || "xponetials-projects";
const projectName = process.env.VERCEL_PROJECT?.trim() || "party-swami";

console.log(`[stage-alias] branch=${stageBranch}`);
console.log(`[stage-alias] ${sourceAlias} -> ${stageDomain}`);

// Step 1: set the URL alias (makes the domain resolve to this deployment)
const command = `vercel alias set ${sourceAlias} ${stageDomain} --scope ${vercelScope}`;
execSync(command, { stdio: "inherit" });

// Step 2: patch the project domain's gitBranch so it appears in the
// deployment's "Domains" panel in the Vercel dashboard.
const token = getVercelToken();
if (token && stageBranch) {
  const url = `https://api.vercel.com/v9/projects/${projectName}/domains/${stageDomain}?teamId=${vercelScope}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ gitBranch: stageBranch }),
  });
  if (res.ok) {
    const data = await res.json();
    console.log(`[stage-alias] gitBranch updated to "${data.gitBranch ?? stageBranch}" on ${stageDomain}`);
  } else {
    console.warn(`[stage-alias] gitBranch patch failed (${res.status}) — dashboard link may not appear, but alias is active`);
  }
} else {
  console.warn("[stage-alias] No Vercel token found — skipping gitBranch patch");
}
