import { spawnSync } from "node:child_process";

const workflowName = process.env.CLOUD_WORKFLOW_NAME ?? "Validation";

function run(command, args, label) {
  const result = spawnSync(command, args, { stdio: "pipe", encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    throw new Error(`${label} failed with exit code ${result.status ?? 1}`);
  }

  return result.stdout.trim();
}

try {
  run("gh", ["--version"], "check gh availability");
} catch {
  console.error("[cloud:status] GitHub CLI(gh)가 필요합니다.");
  console.error("[cloud:status] 설치: https://cli.github.com/");
  process.exit(1);
}

try {
  const jsonOutput = run(
    "gh",
    ["run", "list", "--workflow", workflowName, "--limit", "5", "--json", "databaseId,status,conclusion,displayTitle,url,headBranch,createdAt"],
    "fetch workflow runs"
  );

  const runs = JSON.parse(jsonOutput);
  if (!Array.isArray(runs) || runs.length === 0) {
    console.log(`[cloud:status] workflow '${workflowName}' 실행 이력이 없습니다.`);
    process.exit(0);
  }

  console.log(`[cloud:status] latest runs for '${workflowName}'`);
  for (const run of runs) {
    const line = [
      `id=${run.databaseId}`,
      `status=${run.status}`,
      `conclusion=${run.conclusion ?? "-"}`,
      `branch=${run.headBranch}`,
      `createdAt=${run.createdAt}`,
      `url=${run.url}`
    ].join(" | ");

    console.log(line);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[cloud:status] ${message}`);
  process.exit(1);
}
