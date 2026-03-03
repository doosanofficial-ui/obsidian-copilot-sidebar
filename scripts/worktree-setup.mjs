import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const repoName = path.basename(repoRoot);
const worktreeRoot = process.env.LANE_WORKTREE_ROOT
  ? path.resolve(repoRoot, process.env.LANE_WORKTREE_ROOT)
  : path.resolve(repoRoot, "..");
const baseRef = process.env.LANE_BASE_REF ?? "origin/main";

const laneConfigs = [
  { lane: "subagent", branch: "lane/subagent" },
  { lane: "cli", branch: "lane/cli" },
  { lane: "cloud", branch: "lane/cloud" }
];

function run(command, args, label, allowFail = false, stdinText) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    input: stdinText
  });

  if (result.error) {
    throw result.error;
  }

  if (!allowFail && result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(`[worktree:setup] ${label} failed: ${stderr || stdout || `exit ${result.status}`}`);
  }

  return result;
}

function parseWorktrees() {
  const out = run("git", ["worktree", "list", "--porcelain"], "list worktrees").stdout;
  const lines = out.split("\n");
  const records = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      if (current) {
        records.push(current);
      }
      current = { path: line.slice("worktree ".length), branch: null };
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("branch refs/heads/")) {
      current.branch = line.slice("branch refs/heads/".length);
    }
  }

  if (current) {
    records.push(current);
  }

  return records;
}

function hasLocalBranch(branch) {
  const result = run(
    "git",
    ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
    `check branch ${branch}`,
    true
  );
  return result.status === 0;
}

run("git", ["fetch", "origin", "--prune"], "fetch origin");

const existing = parseWorktrees();
const existingPaths = new Set(existing.map((item) => path.resolve(item.path)));
const existingBranches = new Set(existing.map((item) => item.branch).filter(Boolean));

console.log(`[worktree:setup] repo=${repoRoot}`);
console.log(`[worktree:setup] worktreeRoot=${worktreeRoot}`);
console.log(`[worktree:setup] baseRef=${baseRef}`);

for (const cfg of laneConfigs) {
  const targetPath = path.resolve(worktreeRoot, `${repoName}-wt-${cfg.lane}`);

  if (!existingPaths.has(targetPath) && existsSync(targetPath)) {
    console.log(`[warn] lane=${cfg.lane} path exists but is not a registered worktree: ${targetPath}`);
    console.log("[warn] remove the directory or change LANE_WORKTREE_ROOT, then rerun setup");
    continue;
  }

  if (existingPaths.has(targetPath)) {
    console.log(`[skip] lane=${cfg.lane} path already exists as worktree: ${targetPath}`);
    continue;
  }

  if (existingBranches.has(cfg.branch)) {
    console.log(`[skip] lane=${cfg.lane} branch already attached in another worktree: ${cfg.branch}`);
    continue;
  }

  if (hasLocalBranch(cfg.branch)) {
    run("git", ["worktree", "add", targetPath, cfg.branch], `add worktree for ${cfg.lane}`);
    console.log(`[ok] lane=${cfg.lane} attached existing branch=${cfg.branch} path=${targetPath}`);
    continue;
  }

  run(
    "git",
    ["worktree", "add", "-b", cfg.branch, targetPath, baseRef],
    `add worktree for ${cfg.lane} from ${baseRef}`
  );
  console.log(`[ok] lane=${cfg.lane} created branch=${cfg.branch} path=${targetPath}`);
}

const finalList = run("git", ["worktree", "list"], "final worktree list").stdout.trim();
console.log("[worktree:setup] current worktrees");
console.log(finalList);
