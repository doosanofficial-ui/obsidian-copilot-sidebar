import { spawnSync } from "node:child_process";

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`[branch:protect:status] ${label} failed: ${stderr || `exit ${result.status}`}`);
  }

  return result.stdout;
}

function runAllowFail(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result;
}

function ensureGhReady() {
  const ghVersion = runAllowFail("gh", ["--version"]);
  if (ghVersion.error || ghVersion.status !== 0) {
    throw new Error("[branch:protect:status] gh CLI is required. Install gh and authenticate first.");
  }

  const auth = runAllowFail("gh", ["auth", "status"]);
  if (auth.error || auth.status !== 0) {
    throw new Error("[branch:protect:status] gh auth is required. Run `gh auth login`.");
  }
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

function fetchCollaboratorLogins(owner, name) {
  const output = run(
    "gh",
    ["api", `repos/${owner}/${name}/collaborators`],
    "list repository collaborators"
  );

  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => item?.login)
    .filter((login) => typeof login === "string" && login.length > 0);
}

const remote = run("git", ["config", "--get", "remote.origin.url"], "get origin url").trim();
const { owner, name } = parseRepoFromRemote(remote);
ensureGhReady();
const collaborators = fetchCollaboratorLogins(owner, name);
const soloMode = collaborators.length <= 1;

const output = run(
  "gh",
  ["api", `repos/${owner}/${name}/branches/main/protection`],
  "fetch branch protection"
);

const data = JSON.parse(output);
console.log(`[branch:protect:status] repo=${owner}/${name}`);
console.log(`collaboratorCount=${collaborators.length}`);
console.log(`reviewPolicyMode=${soloMode ? "solo" : "team"}`);
console.log(`requiredApprovals=${data.required_pull_request_reviews?.required_approving_review_count ?? 0}`);
console.log(`requireCodeOwner=${Boolean(data.required_pull_request_reviews?.require_code_owner_reviews)}`);
console.log(`dismissStale=${Boolean(data.required_pull_request_reviews?.dismiss_stale_reviews)}`);
console.log(`requiredConversationResolution=${Boolean(data.required_conversation_resolution?.enabled)}`);
console.log(`linearHistory=${Boolean(data.required_linear_history?.enabled)}`);
console.log(`statusChecksStrict=${Boolean(data.required_status_checks?.strict)}`);
console.log(`statusCheckContexts=${(data.required_status_checks?.contexts ?? []).join(",")}`);
