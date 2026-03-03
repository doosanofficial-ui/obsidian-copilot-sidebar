import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const rootDir = process.cwd();
const require = createRequire(import.meta.url);
const smokeReportPath = path.join(rootDir, ".tmp", "smoke-run.json");

await fs.mkdir(path.dirname(smokeReportPath), { recursive: true });

class FakeElement {
  constructor(options = {}) {
    this.text = options.text ?? "";
    this.cls = options.cls ?? "";
    this.children = [];
  }

  empty() {
    this.children = [];
    this.text = "";
  }

  createDiv(options = {}) {
    const child = new FakeElement(options);
    this.children.push(child);
    return child;
  }
}

class FakeContainer {
  constructor() {
    this.children = [new FakeElement(), new FakeElement()];
  }

  empty() {
    this.children = [];
  }
}

class MockItemView {
  constructor(leaf) {
    this.leaf = leaf;
    this.containerEl = new FakeContainer();
  }
}

class MockPlugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
    this.__views = [];
    this.__commands = [];
  }

  registerView(type, creator) {
    this.__views.push({ type, creator });
  }

  addCommand(command) {
    this.__commands.push(command);
  }
}

const events = {
  setViewStateCalls: [],
  revealLeafCalls: 0,
  detachedTypes: []
};

const leaf = {
  async setViewState(state) {
    events.setViewStateCalls.push(state);
  }
};

const workspace = {
  getLeavesOfType() {
    return [];
  },
  getRightLeaf() {
    return leaf;
  },
  revealLeaf() {
    events.revealLeafCalls += 1;
  },
  async detachLeavesOfType(type) {
    events.detachedTypes.push(type);
  }
};

const app = {
  workspace
};

const obsidianMock = {
  ItemView: MockItemView,
  Plugin: MockPlugin,
  WorkspaceLeaf: class WorkspaceLeaf {}
};

const bundlePath = path.join(rootDir, "main.js");
await fs.access(bundlePath);

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "obsidian") {
    return obsidianMock;
  }
  return originalLoad.call(this, request, parent, isMain);
};

let pass = false;
let failureReason = "";

try {
  const loadedModule = require(bundlePath);
  const PluginClass = loadedModule.default ?? loadedModule;

  assert.equal(typeof PluginClass, "function", "main.js default export must be a class/function.");

  const plugin = new PluginClass(app, { id: "copilot-sidebar" });
  await plugin.onload();

  assert.equal(plugin.__views.length, 1, "one view should be registered on load");
  assert.equal(plugin.__commands.length, 1, "one command should be registered on load");
  assert.equal(plugin.__commands[0].id, "open-copilot-sidebar", "command id mismatch");

  const viewEntry = plugin.__views[0];
  assert.equal(viewEntry.type, "copilot-sidebar-view", "view type mismatch");

  const view = viewEntry.creator(leaf);
  await view.onOpen();
  const body = view.containerEl.children[1];

  assert.ok(body, "view body container should exist");
  assert.ok(body.children.length > 0, "view body should have rendered children");
  assert.equal(body.children[0].cls, "copilot-sidebar-root", "root class should be rendered");

  await view.onClose();
  await plugin.__commands[0].callback();

  assert.equal(events.setViewStateCalls.length, 1, "setViewState should be called once");
  assert.equal(events.revealLeafCalls, 1, "revealLeaf should be called once");

  await plugin.onunload();
  assert.deepEqual(events.detachedTypes, ["copilot-sidebar-view"], "detachLeavesOfType call mismatch");

  pass = true;
} catch (error) {
  failureReason = error instanceof Error ? (error.stack ?? error.message) : String(error);
} finally {
  Module._load = originalLoad;
}

const report = {
  pass,
  failureReason,
  events,
  executedAt: new Date().toISOString()
};

await fs.writeFile(smokeReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (!pass) {
  console.error("[smoke:run] failed");
  console.error(failureReason);
  process.exit(1);
}

console.log("[smoke:run] runtime smoke passed");
