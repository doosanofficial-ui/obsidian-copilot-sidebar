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
    this.tag = options.tag ?? "div";
    this.text = options.text ?? "";
    this.cls = options.cls ?? "";
    this.className = this.cls;
    this.children = [];
    this.listeners = new Map();
    this.value = "";
    this.placeholder = "";
    this.disabled = false;
  }

  empty() {
    this.children = [];
    this.text = "";
  }

  setText(text) {
    this.text = text;
  }

  createDiv(options = {}) {
    return this.createEl("div", options);
  }

  createEl(tag, options = {}) {
    const child = new FakeElement(options);
    child.tag = tag;
    child.className = child.cls;
    if (options.text) {
      child.text = options.text;
    }
    this.children.push(child);
    return child;
  }

  addEventListener(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName).push(callback);
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
    this.__storedData = null;
  }

  registerView(type, creator) {
    this.__views.push({ type, creator });
  }

  addCommand(command) {
    this.__commands.push(command);
  }

  async loadData() {
    return this.__storedData;
  }

  async saveData(data) {
    this.__storedData = JSON.parse(JSON.stringify(data));
  }
}

class MockTFile {
  constructor(path) {
    this.path = path;
  }
}

class MockNotice {
  constructor(message) {
    events.notices.push(String(message));
  }
}

const events = {
  setViewStateCalls: [],
  revealLeafCalls: 0,
  detachedTypes: [],
  notices: [],
  modifiedFiles: [],
  commandIds: []
};

const noteFile = new MockTFile("Inbox.md");
let noteContent = "# Inbox\n\nInitial note text.";
let opened = false;

const leaf = {
  async setViewState(state) {
    opened = true;
    events.setViewStateCalls.push(state);
  }
};

const workspace = {
  getLeavesOfType() {
    return opened ? [leaf] : [];
  },
  getRightLeaf() {
    return leaf;
  },
  revealLeaf() {
    events.revealLeafCalls += 1;
  },
  async detachLeavesOfType(type) {
    events.detachedTypes.push(type);
  },
  getActiveFile() {
    return noteFile;
  },
  getActiveViewOfType() {
    return {
      editor: {
        getSelection() {
          return "Selected snippet from note";
        }
      }
    };
  }
};

const app = {
  workspace,
  vault: {
    async cachedRead() {
      return noteContent;
    },
    getAbstractFileByPath(filePath) {
      return filePath === noteFile.path ? noteFile : null;
    },
    async modify(file, content) {
      noteContent = content;
      events.modifiedFiles.push(file.path);
    }
  }
};

const obsidianMock = {
  ItemView: MockItemView,
  Plugin: MockPlugin,
  WorkspaceLeaf: class WorkspaceLeaf {},
  MarkdownView: class MarkdownView {},
  Notice: MockNotice,
  TFile: MockTFile
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

  const commandIds = plugin.__commands
    .map((command) => command.id)
    .sort();
  events.commandIds = commandIds;
  assert.deepEqual(
    commandIds,
    [
      "apply-pending-changes",
      "ask-about-current-note",
      "open-copilot-sidebar",
      "start-new-chat-session"
    ],
    "command set mismatch"
  );

  const viewEntry = plugin.__views[0];
  assert.equal(viewEntry.type, "copilot-sidebar-view", "view type mismatch");

  const view = viewEntry.creator(leaf);
  await view.onOpen();
  const body = view.containerEl.children[1];

  assert.ok(body, "view body container should exist");
  assert.ok(body.children.length > 0, "view body should have rendered children");
  assert.equal(body.children[0].cls, "copilot-sidebar-root", "root class should be rendered");

  const openCommand = plugin.__commands.find((command) => command.id === "open-copilot-sidebar");
  const startSessionCommand = plugin.__commands.find((command) => command.id === "start-new-chat-session");
  const applyCommand = plugin.__commands.find((command) => command.id === "apply-pending-changes");

  assert.ok(openCommand, "open command should exist");
  assert.ok(startSessionCommand, "start session command should exist");
  assert.ok(applyCommand, "apply command should exist");

  await openCommand.callback();
  await startSessionCommand.callback();
  await applyCommand.callback();

  await view.onClose();

  assert.equal(events.setViewStateCalls.length, 1, "setViewState should be called once");
  assert.ok(events.revealLeafCalls >= 1, "revealLeaf should be called at least once");
  assert.ok(events.notices.includes("No pending changes to apply."), "apply command should show empty-state notice");

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
  noteContent,
  executedAt: new Date().toISOString()
};

await fs.writeFile(smokeReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (!pass) {
  console.error("[smoke:run] failed");
  console.error(failureReason);
  process.exit(1);
}

console.log("[smoke:run] runtime smoke passed");
