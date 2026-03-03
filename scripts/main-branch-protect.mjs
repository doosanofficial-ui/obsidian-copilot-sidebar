import { spawnSync } from "node:child_process";

function run(command, args, label, allowFail = false, input) {
  const result = spawnSync(command, args, { encoding: "utf8", input });
  if (result.error) {
    throw result.error;
  }

  if (!allowFail && result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(`[branch:protect:main] ${label} failed: ${stderr || stdout || `exit ${result.status}`}`);
  }

  return result;
}

function parseRepoFromRemote(url) {
  if (url.startsWith("git@github.com:")) {
    const slug = url.replace("git@github.com:", "").replace(/\.git$/, "");
    const [owner, name] = slug.split("/");
    return { owner, name };
  }

  if (url.startsWith("https://github.com/")) {
    const slug = url.replace("https://github.com/", "").replace(/\.git$/, "");
    const [owner, name] = slug.split("/");
    return { owner, name };
  }

  throw new Error(`unsupported remote url: ${url}`);
}

const remote = run("git", ["config", "--get", "remote.origin.url"], "get origin url").stdout.trim();
const { owner, name } = parseRepoFromRemote(remote);

const body = {
  required_status_checks: null,
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: true,
    required_approving_review_count: 1,
    require_last_push_approval: false
  },
  restrictions: null,
  required_linear_history: true,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
  lock_branch: false,
  allow_fork_syncing: true
};

run("gh", ["auth", "status"], "gh auth status");
run(
  "gh",
  ["api", "-X", "PUT", `repos/${owner}/${name}/branches/main/protection`, "--input", "-"],
  "apply main branch protection",
  false,
  `${JSON.stringify(body)}\n`
);

console.log(`[branch:protect:main] protection applied to ${owner}/${name}`);
console.log("[branch:protect:main] required: PR review 1+, code owner review, conversation resolution, linear history");
