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

// Step 1: vercel alias set — updates the URL-level alias record that Vercel's
// reconciler uses as the source of truth. Must always run first.
execSync(`vercel alias set ${sourceAlias} ${stageDomain} --scope ${vercelScope}`, { stdio: "inherit" });

const token = getVercelToken();
if (!token) {
  console.warn("[stage-alias] No Vercel token found — skipping deployment-level assignment and gitBranch patch");
  process.exit(0);
}

// Step 2: resolve the source alias URL to a deployment ID via vercel inspect
// Merge stderr into stdout so the deployment ID table is captured regardless
// of which stream the CLI writes it to.
const sourceHost = sourceAlias.replace(/^https?:\/\//, "").replace(/\/$/, "");
let deploymentId;
try {
  const inspectOut = execSync(
    `vercel inspect ${sourceHost} --scope ${vercelScope} 2>&1`,
    { encoding: "utf8", shell: true },
  );
  const match = inspectOut.match(/\b(dpl_\w+)\b/);
  deploymentId = match?.[1] ?? null;
} catch (e) {
  deploymentId = null;
}

if (!deploymentId) {
  console.error("[stage-alias] Could not resolve deployment ID from source URL:", sourceHost);
  process.exit(1);
}

console.log(`[stage-alias] Resolved deployment ID: ${deploymentId}`);

// Step 3: assign the custom domain directly to the deployment so it appears
// in the deployment's Domains panel in the Vercel dashboard
const assignUrl = `https://api.vercel.com/v2/deployments/${deploymentId}/aliases?teamId=${vercelScope}`;
const assignRes = await fetch(assignUrl, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ alias: stageDomain }),
});
if (assignRes.ok) {
  console.log(`[stage-alias] ${stageDomain} assigned to deployment ${deploymentId}`);
} else {
  const body = await assignRes.text();
  console.warn(`[stage-alias] Alias assignment failed (${assignRes.status}): ${body}`);
}

// Step 4: update the project domain's gitBranch so future pushes to this
// branch automatically assign the custom domain during the build step
const patchUrl = `https://api.vercel.com/v9/projects/${projectName}/domains/${stageDomain}?teamId=${vercelScope}`;
const patchRes = await fetch(patchUrl, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ gitBranch: stageBranch }),
});
if (patchRes.ok) {
  const data = await patchRes.json();
  console.log(`[stage-alias] gitBranch set to "${data.gitBranch ?? stageBranch}" on ${stageDomain}`);
} else {
  console.warn(`[stage-alias] gitBranch patch failed (${patchRes.status}) — future auto-assign may not work`);
}
