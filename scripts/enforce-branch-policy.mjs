#!/usr/bin/env node

import { execSync } from "node:child_process";

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

if (branch === "main") {
  fail(
    [
      'Direct commits to "main" are blocked.',
      'Create work from "dev", a "stage/*" branch, or a Party Swami worktree branch.',
      "Suggested next step: git checkout dev",
    ].join("\n"),
  );
}

process.exit(0);
