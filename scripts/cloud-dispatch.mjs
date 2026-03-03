import { spawnSync } from "node:child_process";

const workflowName = process.env.CLOUD_WORKFLOW_NAME ?? "Validation";
const workflowRef = process.env.CLOUD_WORKFLOW_REF ?? "main";

function run(command, args, label) {
  const result = spawnSync(command, args, { stdio: "pipe", encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 1}`);
  }
}

try {
  run("gh", ["--version"], "check gh availability");
} catch {
  console.error("[cloud:dispatch] GitHub CLI(gh)가 필요합니다.");
  console.error("[cloud:dispatch] 설치: https://cli.github.com/");
  process.exit(1);
}

try {
  run("gh", ["auth", "status"], "check gh auth status");
  run("gh", ["workflow", "run", workflowName, "--ref", workflowRef], "dispatch workflow");
  console.log(`[cloud:dispatch] workflow '${workflowName}' dispatched on ref '${workflowRef}'`);
  console.log("[cloud:dispatch] 다음 명령으로 상태를 확인하세요: npm run cloud:status");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[cloud:dispatch] ${message}`);
  process.exit(1);
}
