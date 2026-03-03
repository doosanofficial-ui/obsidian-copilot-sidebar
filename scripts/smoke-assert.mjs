import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const prepareReportPath = path.join(rootDir, ".tmp", "smoke-prepare.json");
const runReportPath = path.join(rootDir, ".tmp", "smoke-run.json");

const prepareRaw = await fs.readFile(prepareReportPath, "utf8");
const runRaw = await fs.readFile(runReportPath, "utf8");

const prepareReport = JSON.parse(prepareRaw);
const runReport = JSON.parse(runRaw);

assert.ok(prepareReport.pluginId, "smoke:prepare report must include pluginId");
assert.ok(prepareReport.pluginDir, "smoke:prepare report must include pluginDir");
await fs.access(prepareReport.pluginDir);

assert.equal(runReport.pass, true, "smoke:run must pass");
assert.deepEqual(
	runReport.events.commandIds,
	[
		"apply-pending-changes",
		"ask-about-current-note",
		"open-copilot-sidebar",
		"start-new-chat-session"
	],
	"command ids mismatch"
);
assert.equal(runReport.events.setViewStateCalls.length, 1, "setViewState call count mismatch");
assert.ok(runReport.events.revealLeafCalls >= 1, "revealLeaf call count mismatch");
assert.deepEqual(runReport.events.detachedTypes, ["copilot-sidebar-view"], "onunload detach call mismatch");

console.log("[smoke:assert] all runtime assertions passed");
