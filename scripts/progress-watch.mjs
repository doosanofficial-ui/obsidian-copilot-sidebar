import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const progressPath = path.join(rootDir, ".tmp", "agent-progress.json");
const pollIntervalMs = 1000;

function durationText(durationMs) {
  if (durationMs === null || durationMs === undefined) {
    return "-";
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}

function statusTag(status) {
  if (status === "running") {
    return "RUN ";
  }

  if (status === "passed") {
    return "PASS";
  }

  if (status === "failed") {
    return "FAIL";
  }

  return "PEND";
}

function render(progress) {
  const lines = [];
  lines.push("Agent Progress Watch");
  lines.push(`status: ${progress.status}`);
  lines.push(`completed: ${progress.completedSteps}/${progress.totalSteps}`);
  lines.push(`current: ${progress.currentStepId ?? "-"}`);
  lines.push(`startedAt: ${progress.startedAt}`);
  lines.push(`finishedAt: ${progress.finishedAt ?? "-"}`);
  lines.push("");

  for (const step of progress.steps) {
    lines.push(
      `${String(step.index).padStart(2, "0")}. ${statusTag(step.status)} ${step.id.padEnd(14, " ")} ${durationText(step.durationMs).padStart(7, " ")}  ${step.logPath}`
    );
  }

  return lines.join("\n");
}

async function readProgress() {
  const raw = await fs.readFile(progressPath, "utf8");
  return JSON.parse(raw);
}

while (true) {
  try {
    const progress = await readProgress();
    console.log(`\n[${new Date().toISOString()}]`);
    console.log(render(progress));

    if (progress.status === "passed" || progress.status === "failed") {
      break;
    }
  } catch {
    console.log(`\n[${new Date().toISOString()}]`);
    console.log(`Waiting for progress file: ${path.relative(rootDir, progressPath)}`);
    console.log("Run `npm run verify:tracked` in another terminal.");
  }

  await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
}
