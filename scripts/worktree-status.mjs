import { spawnSync } from "node:child_process";

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`[worktree:status] ${label} failed: ${stderr || `exit ${result.status}`}`);
  }

  return result.stdout;
}

const currentBranch = run("git", ["branch", "--show-current"], "read current branch").trim();
const worktrees = run("git", ["worktree", "list", "--porcelain"], "list worktrees");

const lines = worktrees.split("\n");
const rows = [];
let row = null;

for (const line of lines) {
  if (line.startsWith("worktree ")) {
    if (row) {
      rows.push(row);
    }
    row = { path: line.slice("worktree ".length), branch: "(detached)", head: "" };
    continue;
  }

  if (!row) {
    continue;
  }

  if (line.startsWith("branch refs/heads/")) {
    row.branch = line.slice("branch refs/heads/".length);
  } else if (line.startsWith("HEAD ")) {
    row.head = line.slice("HEAD ".length).slice(0, 7);
  }
}

if (row) {
  rows.push(row);
}

console.log(`[worktree:status] currentBranch=${currentBranch}`);
for (const item of rows) {
  console.log(`${item.branch.padEnd(22, " ")} ${item.head.padEnd(8, " ")} ${item.path}`);
}
