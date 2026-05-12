#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function run(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function runOk(command) {
  try {
    execSync(command, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`\n[push-policy] ${message}\n`);
  process.exit(1);
}

function branchNameFromRef(ref) {
  return ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : "";
}

function isStageBranch(branch) {
  return branch === "stage" || branch.startsWith("stage/");
}

function listRemoteStageRefs() {
  const output = run("git for-each-ref --format='%(refname)' refs/remotes/origin/stage refs/remotes/origin/stage/*");
  if (!output) {
    return [];
  }
  return output.split(/\r?\n/).map((line) => line.replace(/^'+|'+$/g, ""));
}

function hasFetchedRef(ref) {
  return runOk(`git rev-parse --verify ${ref}`);
}

function assertAncestor(ancestorRef, descendantSha, message) {
  if (!hasFetchedRef(ancestorRef)) {
    fail(`${message}\nMissing reference: ${ancestorRef}. Run: git fetch origin`);
  }

  const ok = runOk(`git merge-base --is-ancestor ${ancestorRef} ${descendantSha}`);
  if (!ok) {
    fail(message);
  }
}

const pushSpec = readFileSync(0, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (pushSpec.length === 0) {
  process.exit(0);
}

for (const line of pushSpec) {
  const [localRef, localSha, remoteRef] = line.split(/\s+/);
  if (!remoteRef?.startsWith("refs/heads/")) {
    continue;
  }

  const remoteBranch = branchNameFromRef(remoteRef);
  const localBranch = branchNameFromRef(localRef);

  if (!remoteBranch) {
    continue;
  }

  if (remoteBranch === "main") {
    if (localBranch !== "main") {
      fail(
        [
          `Push to "main" is blocked from "${localBranch || localRef}".`,
          'Only the local "main" branch may push to remote "main".',
        ].join("\n"),
      );
    }

    const stageRefs = listRemoteStageRefs();
    const stageAncestorFound = stageRefs.some((ref) => runOk(`git merge-base --is-ancestor ${ref} ${localSha}`));
    if (!stageAncestorFound) {
      fail(
        [
          'Push to "main" is blocked because no remote stage branch is an ancestor of this commit.',
          'Promote by merging tested stage into main first.',
        ].join("\n"),
      );
    }
  }

  if (isStageBranch(remoteBranch)) {
    if (localBranch !== remoteBranch) {
      fail(
        [
          `Push to "${remoteBranch}" is blocked from "${localBranch || localRef}".`,
          "Push the matching local stage branch only.",
        ].join("\n"),
      );
    }

    assertAncestor(
      "refs/remotes/origin/dev",
      localSha,
      `Push to "${remoteBranch}" is blocked because origin/dev is not an ancestor. Merge dev into stage first.`,
    );
  }
}

process.exit(0);
