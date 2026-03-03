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

const remote = run("git", ["config", "--get", "remote.origin.url"], "get origin url").trim();
const { owner, name } = parseRepoFromRemote(remote);

const output = run(
  "gh",
  ["api", `repos/${owner}/${name}/branches/main/protection`],
  "fetch branch protection"
);

const data = JSON.parse(output);
console.log(`[branch:protect:status] repo=${owner}/${name}`);
console.log(`requiredApprovals=${data.required_pull_request_reviews?.required_approving_review_count ?? 0}`);
console.log(`requireCodeOwner=${Boolean(data.required_pull_request_reviews?.require_code_owner_reviews)}`);
console.log(`dismissStale=${Boolean(data.required_pull_request_reviews?.dismiss_stale_reviews)}`);
console.log(`requiredConversationResolution=${Boolean(data.required_conversation_resolution?.enabled)}`);
console.log(`linearHistory=${Boolean(data.required_linear_history?.enabled)}`);
