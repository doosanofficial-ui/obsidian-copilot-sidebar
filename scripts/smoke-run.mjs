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
  createdFolders: [],
  createdFiles: [],
  commandIds: []
};

const noteFile = new MockTFile("Inbox.md");
let noteContent = "# Inbox\n\nInitial note text.";
let opened = false;
const createdFolders = new Set();
const createdFiles = new Map([[noteFile.path, noteFile]]);

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
      if (createdFiles.has(filePath)) {
        return createdFiles.get(filePath);
      }
      if (createdFolders.has(filePath)) {
        return { path: filePath };
      }
      return null;
    },
    async createFolder(folderPath) {
      createdFolders.add(folderPath);
      events.createdFolders.push(folderPath);
    },
    async create(filePath, content) {
      const file = new MockTFile(filePath);
      createdFiles.set(filePath, file);
      events.createdFiles.push({ path: filePath, size: String(content).length });
      return file;
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
  const requiredCommands = [
    "apply-pending-changes",
    "ask-about-current-note",
    "capture-beta-feedback-note",
    "copy-diagnostics-summary",
    "open-copilot-sidebar",
    "open-sidebar-settings-panel",
    "refresh-auth-status",
    "retry-last-failed-prompt",
    "start-new-chat-session",
    "undo-last-applied-change"
  ];
  for (const commandId of requiredCommands) {
    assert.ok(commandIds.includes(commandId), `missing required command: ${commandId}`);
  }

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
  const captureFeedbackCommand = plugin.__commands.find((command) => command.id === "capture-beta-feedback-note");
  const copyDiagnosticsCommand = plugin.__commands.find((command) => command.id === "copy-diagnostics-summary");
  const openSettingsCommand = plugin.__commands.find((command) => command.id === "open-sidebar-settings-panel");
  const refreshAuthCommand = plugin.__commands.find((command) => command.id === "refresh-auth-status");
  const retryFailedPromptCommand = plugin.__commands.find((command) => command.id === "retry-last-failed-prompt");
  const undoCommand = plugin.__commands.find((command) => command.id === "undo-last-applied-change");

  assert.ok(openCommand, "open command should exist");
  assert.ok(startSessionCommand, "start session command should exist");
  assert.ok(applyCommand, "apply command should exist");
  assert.ok(captureFeedbackCommand, "capture feedback command should exist");
  assert.ok(copyDiagnosticsCommand, "copy diagnostics command should exist");
  assert.ok(openSettingsCommand, "open settings command should exist");
  assert.ok(refreshAuthCommand, "refresh auth command should exist");
  assert.ok(retryFailedPromptCommand, "retry failed prompt command should exist");
  assert.ok(undoCommand, "undo command should exist");

  await openCommand.callback();
  await openSettingsCommand.callback();
  await startSessionCommand.callback();
  await applyCommand.callback();
  await captureFeedbackCommand.callback();
  await copyDiagnosticsCommand.callback();
  await refreshAuthCommand.callback();
  await retryFailedPromptCommand.callback();
  await undoCommand.callback();

  await view.onClose();

  assert.equal(events.setViewStateCalls.length, 1, "setViewState should be called once");
  assert.ok(events.revealLeafCalls >= 1, "revealLeaf should be called at least once");
  assert.ok(events.notices.includes("No pending changes to apply."), "apply command should show empty-state notice");
  assert.ok(events.notices.some((notice) => notice.startsWith("Beta feedback note created:")), "capture feedback should create a feedback note");
  assert.ok(events.notices.includes("No failed prompt to retry."), "retry command should show empty-state notice");
  assert.ok(events.notices.includes("No applied change to undo."), "undo command should show empty-state notice");
  assert.ok(events.createdFolders.includes("Copilot Sidebar Feedback"), "feedback folder should be created");
  assert.ok(events.createdFiles.length >= 1, "at least one feedback file should be created");

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
