import { spawnSync } from "node:child_process";

function run(command, args, label, allowFail = false) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) {
    if (allowFail) {
      return result;
    }
    throw result.error;
  }

  if (!allowFail && result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`[review:status] ${label} failed: ${stderr || `exit ${result.status}`}`);
  }

  return result;
}

function ensureGhReady() {
  const ghVersion = run("gh", ["--version"], "check gh availability", true);
  if (ghVersion.status !== 0) {
    throw new Error("[review:status] gh CLI is required. Install gh and authenticate first.");
  }

  const auth = run("gh", ["auth", "status"], "gh auth status", true);
  if (auth.status !== 0) {
    throw new Error("[review:status] gh auth is required. Run `gh auth login`.");
  }
}

const branch = run("git", ["branch", "--show-current"], "get current branch").stdout.trim();
console.log(`[review:status] branch=${branch}`);

if (branch === "main") {
  console.log("[review:status] main branch에서는 PR 상태 대신 브랜치 생성 후 실행하세요.");
  process.exit(1);
}

ensureGhReady();

const prStatus = run("gh", ["pr", "status"], "gh pr status", true);
if (prStatus.stdout) {
  console.log(prStatus.stdout.trim());
}
if (prStatus.stderr) {
  console.log(prStatus.stderr.trim());
}

const checks = run(
  "gh",
  ["run", "list", "--workflow", "Validation", "--limit", "3"],
  "gh run list",
  true
);
if (checks.stdout) {
  console.log("[review:status] recent Validation runs");
  console.log(checks.stdout.trim());
}
if (checks.stderr) {
  console.log(checks.stderr.trim());
}
