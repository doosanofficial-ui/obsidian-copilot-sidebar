import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const tmpDir = path.join(rootDir, ".tmp");
const logsDir = path.join(tmpDir, "agent-progress-logs");
const progressJsonPath = path.join(tmpDir, "agent-progress.json");
const progressMarkdownPath = path.join(tmpDir, "agent-progress.md");

const steps = [
  { id: "check", name: "Type check", command: "npm run check" },
  { id: "build", name: "Build", command: "npm run build" },
  { id: "smoke-prepare", name: "Smoke prepare", command: "npm run smoke:prepare" },
  { id: "smoke-run", name: "Smoke run", command: "npm run smoke:run" },
  { id: "smoke-assert", name: "Smoke assert", command: "npm run smoke:assert" },
  { id: "verify-e2e", name: "Verify e2e", command: "npm run verify:e2e" }
];

const progress = {
  version: 1,
  status: "running",
  startedAt: new Date().toISOString(),
  finishedAt: null,
  totalSteps: steps.length,
  completedSteps: 0,
  currentStepId: null,
  environment: {
    platform: process.platform,
    node: process.version,
    cwd: rootDir
  },
  steps: steps.map((step, index) => ({
    index: index + 1,
    id: step.id,
    name: step.name,
    command: step.command,
    status: "pending",
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    exitCode: null,
    logPath: path.join(".tmp", "agent-progress-logs", `${String(index + 1).padStart(2, "0")}-${step.id}.log`)
  }))
};

function statusMark(status) {
  if (status === "passed") {
    return "PASS";
  }

  if (status === "failed") {
    return "FAIL";
  }

  if (status === "running") {
    return "RUN";
  }

  return "PEND";
}

function durationText(durationMs) {
  if (durationMs === null || durationMs === undefined) {
    return "-";
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}

function buildMarkdownReport() {
  const lines = [];
  lines.push("# Agent Progress");
  lines.push("");
  lines.push(`- status: ${progress.status}`);
  lines.push(`- startedAt: ${progress.startedAt}`);
  lines.push(`- finishedAt: ${progress.finishedAt ?? "-"}`);
  lines.push(`- completedSteps: ${progress.completedSteps}/${progress.totalSteps}`);
  lines.push(`- currentStepId: ${progress.currentStepId ?? "-"}`);
  lines.push("");
  lines.push("| # | Step | Status | Duration | Log | Command |");
  lines.push("|---|---|---|---|---|---|");

  for (const step of progress.steps) {
    lines.push(
      `| ${step.index} | ${step.name} | ${step.status} | ${durationText(step.durationMs)} | ${step.logPath} | \`${step.command}\` |`
    );
  }

  return `${lines.join("\n")}\n`;
}

async function persistProgress() {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.writeFile(progressJsonPath, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
  await fs.writeFile(progressMarkdownPath, buildMarkdownReport(), "utf8");
}

function printBoard() {
  const title = `[agent-progress] ${progress.completedSteps}/${progress.totalSteps} completed, status=${progress.status}`;
  console.log(`\n${title}`);

  for (const step of progress.steps) {
    const line = `${String(step.index).padStart(2, "0")}. ${statusMark(step.status).padEnd(4, " ")} ${step.id.padEnd(14, " ")} ${durationText(step.durationMs).padStart(7, " ")}`;
    console.log(line);
  }
}

function runStep(step, logAbsolutePath) {
  return new Promise((resolve) => {
    const child = spawn(step.command, {
      cwd: rootDir,
      shell: true,
      env: process.env
    });

    let logBuffer = "";
    const appendChunk = (chunk) => {
      const text = chunk.toString();
      logBuffer += text;
      process.stdout.write(text);
    };

    child.stdout.on("data", appendChunk);
    child.stderr.on("data", appendChunk);

    child.on("close", async (code) => {
      await fs.mkdir(path.dirname(logAbsolutePath), { recursive: true });
      await fs.writeFile(logAbsolutePath, logBuffer, "utf8");
      resolve(code ?? 1);
    });
  });
}

await fs.mkdir(logsDir, { recursive: true });
await persistProgress();
printBoard();

for (const [index, step] of steps.entries()) {
  const stepState = progress.steps[index];
  const logAbsolutePath = path.join(rootDir, stepState.logPath);
  const startAt = Date.now();

  progress.currentStepId = step.id;
  stepState.status = "running";
  stepState.startedAt = new Date(startAt).toISOString();

  await persistProgress();
  printBoard();

  const code = await runStep(step, logAbsolutePath);

  const endAt = Date.now();
  stepState.exitCode = code;
  stepState.finishedAt = new Date(endAt).toISOString();
  stepState.durationMs = endAt - startAt;

  if (code === 0) {
    stepState.status = "passed";
    progress.completedSteps += 1;
  } else {
    stepState.status = "failed";
    progress.status = "failed";
    progress.finishedAt = new Date(endAt).toISOString();
    progress.currentStepId = step.id;
    await persistProgress();
    printBoard();
    console.error(`\n[agent-progress] step failed: ${step.id} (exit code ${code})`);
    console.error(`[agent-progress] inspect log: ${stepState.logPath}`);
    process.exit(code);
  }

  await persistProgress();
  printBoard();
}

progress.status = "passed";
progress.currentStepId = null;
progress.finishedAt = new Date().toISOString();
await persistProgress();
printBoard();

console.log("\n[agent-progress] all verification steps passed");
console.log(`[agent-progress] report: ${path.relative(rootDir, progressJsonPath)}`);
console.log(`[agent-progress] summary: ${path.relative(rootDir, progressMarkdownPath)}`);
