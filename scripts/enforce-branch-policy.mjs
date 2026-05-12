#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

function run(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function getCurrentBranch() {
  return run("git rev-parse --abbrev-ref HEAD");
}

function getStagedFileCount() {
  const output = run("git diff --cached --name-only");
  if (!output) {
    return 0;
  }
  return output.split(/\r?\n/).filter(Boolean).length;
}

function fail(message) {
  console.error(`\n[branch-policy] ${message}\n`);
  process.exit(1);
}

const branch = getCurrentBranch();
const stagedFileCount = getStagedFileCount();

if (stagedFileCount === 0) {
  process.exit(0);
}

const isStageBranch = branch === "stage" || branch.startsWith("stage/");
const isMergeCommitInProgress = existsSync(".git/MERGE_HEAD");

if (branch === "main" && !isMergeCommitInProgress) {
  fail(
    [
      'Direct commits to "main" are blocked.',
      'Create work from "dev" or a Party Swami worktree branch.',
      "Suggested next step: git checkout dev",
    ].join("\n"),
  );
}

if (isStageBranch && !isMergeCommitInProgress) {
  fail(
    [
      `Direct commits to "${branch}" are blocked.`,
      'Promote changes by merging from "dev" into your stage branch.',
      "Suggested next step: git checkout dev",
    ].join("\n"),
  );
}

process.exit(0);
